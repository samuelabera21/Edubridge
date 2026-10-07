import { prisma } from "../../infrastructure/prisma/client.js";
import {
    OrganizationUnitType,
    ProgramPriority,
    ProgramStatus,
    ProgramImplementationStatus
} from "../../generated/prisma/client.js";
import { HierarchyScopeService } from "../hierarchy/hierarchy-scope.service.js";

export interface CreateProgramInput {
    name: string;
    description: string;
    objective: string;
    priority?: ProgramPriority;
    startDate: string | Date;
    endDate: string | Date;
    instructions: string;
    requiredAction: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    status?: ProgramStatus;
    targetLevelAll?: boolean;
    targetLevels?: OrganizationUnitType[];
    cascadeDescendants?: boolean;
    targetUnitIds?: string[];
    parentProgramId?: string | null;
}

export interface UpdateImplementationStatusInput {
    status: ProgramImplementationStatus;
    notes?: string | null;
    submittedData?: string | null;
}

export class ProgramService {
    /**
     * Creates and publishes a hierarchical program or subordinate initiative.
     * Enforces that all targets reside strictly within the creator's authorized scope.
     */
    static async createAndPublishProgram(
        input: CreateProgramInput,
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

        // 1. Validate required fields
        if (!input.name || !input.name.trim()) {
            throw new Error("Program name is required.");
        }
        if (!input.description || !input.description.trim()) {
            throw new Error("Program description is required.");
        }
        if (!input.objective || !input.objective.trim()) {
            throw new Error("Program objective is required.");
        }
        if (!input.instructions || !input.instructions.trim()) {
            throw new Error("Implementation instructions are required.");
        }
        if (!input.requiredAction || !input.requiredAction.trim()) {
            throw new Error("Required action is required.");
        }
        if (!input.startDate) {
            throw new Error("Start date is required.");
        }
        if (!input.endDate) {
            throw new Error("End date is required.");
        }

        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error("Invalid start or end date format.");
        }
        if (endDate < startDate) {
            throw new Error("End date cannot be earlier than start date.");
        }

        // 2. Resolve target scope & Validate boundaries
        const targetUnitIds = Array.isArray(input.targetUnitIds) ? input.targetUnitIds.filter(Boolean) : [];
        const accessibleIds = await HierarchyScopeService.getAccessibleOrganizationIds(actorScope.id);

        if (targetUnitIds.length > 0) {
            for (const unitId of targetUnitIds) {
                if (!accessibleIds.includes(unitId)) {
                    const unit = await prisma.organizationUnit.findUnique({
                        where: { id: unitId },
                        select: { name: true }
                    });
                    throw new Error(
                        `Forbidden: Target unit '${unit?.name || unitId}' is outside your authorized hierarchical jurisdiction.`
                    );
                }
            }
        }

        // 3. Parent Program validation if creating a subordinate cascaded initiative
        let parentProgram = null;
        if (input.parentProgramId) {
            parentProgram = await prisma.program.findUnique({
                where: { id: input.parentProgramId },
                include: {
                    createdOrganization: { select: { id: true, name: true, type: true } }
                }
            });
            if (!parentProgram) {
                throw new Error(`Parent program with ID '${input.parentProgramId}' not found.`);
            }
        }

        const priority = input.priority || ProgramPriority.NORMAL;
        const status = input.status || ProgramStatus.PUBLISHED;
        const targetLevelAll = targetUnitIds.length > 0 ? false : (input.targetLevelAll !== undefined ? Boolean(input.targetLevelAll) : true);
        const targetLevels = Array.isArray(input.targetLevels) ? input.targetLevels : [];
        const cascadeDescendants = input.cascadeDescendants !== undefined ? Boolean(input.cascadeDescendants) : false;

        // 4. Create the Program record
        const program = await prisma.program.create({
            data: {
                name: input.name.trim(),
                description: input.description.trim(),
                objective: input.objective.trim(),
                priority,
                status,
                startDate,
                endDate,
                instructions: input.instructions.trim(),
                requiredAction: input.requiredAction.trim(),
                attachmentUrl: input.attachmentUrl?.trim() || null,
                attachmentName: input.attachmentName?.trim() || null,
                createdBy: userId,
                createdOrganizationId: actorScope.id,
                parentProgramId: input.parentProgramId || null,
                targetLevelAll,
                targetLevels,
                cascadeDescendants
            }
        });

        // 5. Link specific targeted units if provided
        if (targetUnitIds.length > 0) {
            await prisma.programTargetUnit.createMany({
                data: targetUnitIds.map(unitId => ({
                    programId: program.id,
                    organizationId: unitId
                })),
                skipDuplicates: true
            });
        }

        // 6. Resolve all recipient organization units within the creator's authorized subtree
        const allUnits = await prisma.organizationUnit.findMany({
            select: { id: true, name: true, type: true, parentId: true }
        });

        // Find all descendants of actor's scope
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
            // Broadcasts to all descendants matching targetLevels (or all descendants if targetLevels is empty)
            for (const unitId of descendantUnitIds) {
                const unit = allUnits.find(u => u.id === unitId);
                if (!unit) continue;
                if (targetLevels.length === 0 || targetLevels.includes(unit.type)) {
                    recipientUnitIds.add(unit.id);
                }
            }
        } else {
            // Targeted specific units within actor's scope
            for (const unitId of targetUnitIds) {
                const targetUnit = allUnits.find(u => u.id === unitId);
                if (!targetUnit) continue;

                if (targetLevels.length === 0 || targetLevels.includes(targetUnit.type)) {
                    recipientUnitIds.add(targetUnit.id);
                }

                // If cascade descendants is enabled, cascade to subordinates of the targeted units
                if (cascadeDescendants) {
                    const queue = [targetUnit.id];
                    while (queue.length > 0) {
                        const cur = queue.shift()!;
                        const children = allUnits.filter(u => u.parentId === cur);
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

        // 7. Seed ProgramImplementation records for each recipient organization
        if (recipientUnitIds.size > 0) {
            await prisma.programImplementation.createMany({
                data: Array.from(recipientUnitIds).map(orgId => ({
                    programId: program.id,
                    organizationId: orgId,
                    status: ProgramImplementationStatus.PENDING,
                    isAcknowledged: false
                })),
                skipDuplicates: true
            });

            // Dispatch in-app notifications to all assigned administrators across recipient units
            try {
                if (prisma.roleAssignment?.findMany && prisma.notification?.createMany) {
                    const roleAssignments = await prisma.roleAssignment.findMany({
                        where: {
                            scopeId: { in: Array.from(recipientUnitIds) }
                        },
                        include: {
                            scope: {
                                select: { id: true, type: true, name: true }
                            }
                        }
                    });

                    const notifMap = new Map<string, { userId: string; organizationId: string; scopeType: string }>();
                    for (const ra of roleAssignments) {
                        const key = `${ra.userId}_${ra.scopeId}`;
                        if (!notifMap.has(key)) {
                            notifMap.set(key, {
                                userId: ra.userId,
                                organizationId: ra.scopeId,
                                scopeType: ra.scope?.type || "REGION"
                            });
                        }
                    }

                    if (notifMap.size > 0) {
                        const notifPrefix = actorScope.type === "FEDERAL" ? "National" : `${actorScope.name}`;
                        await prisma.notification.createMany({
                            data: Array.from(notifMap.values()).map(item => {
                                let link = "/dashboard/programs";
                                if (item.scopeType === "REGION") {
                                    link = "/dashboard/region?tab=programs";
                                } else if (item.scopeType === "ZONE") {
                                    link = "/dashboard/zone?tab=programs";
                                } else if (item.scopeType === "WOREDA") {
                                    link = "/dashboard/woreda?tab=programs";
                                } else if (item.scopeType === "FEDERAL") {
                                    link = "/dashboard/federal?tab=programs";
                                } else if (item.scopeType === "SCHOOL") {
                                    link = "/dashboard/programs";
                                }

                                return {
                                    userId: item.userId,
                                    organizationId: item.organizationId,
                                    title: `${notifPrefix} Initiative: ${program.name}`,
                                    content: `Objective: ${program.objective}. Action required by: ${endDate.toLocaleDateString()}.`,
                                    link,
                                    isRead: false
                                };
                            }),
                            skipDuplicates: true
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to create in-app notifications for program:", err);
            }
        }

        // 8. If this was a subordinate cascaded program, update actor's implementation status on parent program
        if (input.parentProgramId) {
            const parentImp = await prisma.programImplementation.findUnique({
                where: {
                    programId_organizationId: {
                        programId: input.parentProgramId,
                        organizationId: actorScope.id
                    }
                }
            });
            if (parentImp && parentImp.status === ProgramImplementationStatus.PENDING) {
                await prisma.programImplementation.update({
                    where: { id: parentImp.id },
                    data: {
                        status: ProgramImplementationStatus.IN_PROGRESS,
                        startedAt: parentImp.startedAt || new Date(),
                        notes: parentImp.notes || `Cascaded subordinate initiative '${input.name}' to subordinate tiers.`
                    }
                });
            }
        }

        // 9. Audit Logging
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: actorScope.id,
                    userId,
                    action: input.parentProgramId ? "PROGRAM_IMPLEMENTATION_CASCADED" : "PROGRAM_CREATED",
                    resource: "Program",
                    resourceId: program.id,
                    newValue: {
                        name: program.name,
                        priority: program.priority,
                        status: program.status,
                        recipientsCount: recipientUnitIds.size,
                        parentProgramId: program.parentProgramId
                    },
                    ipAddress
                }
            });
        } catch (auditErr) {
            console.warn("[ProgramService] AuditLog creation failed:", auditErr);
        }

        return {
            ...program,
            totalRecipients: recipientUnitIds.size
        };
    }

    /**
     * Lists programs accessible for the actor's scope (received from higher tiers + created by actor).
     */
    static async getProgramsForScope(
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        queryOptions?: {
            status?: ProgramStatus;
            priority?: ProgramPriority;
            search?: string;
            tab?: "all" | "received" | "created";
        }
    ) {
        if (!actorScope) {
            throw new Error("Unauthorized: Active organization scope is required.");
        }

        const tab = queryOptions?.tab || "all";

        // 1. Programs created directly by this organization unit
        let createdPrograms: any[] = [];
        if (tab === "all" || tab === "created") {
            const created = await prisma.program.findMany({
                where: {
                    ...(actorScope.type === "FEDERAL" ? {} : { createdOrganizationId: actorScope.id }),
                    ...(queryOptions?.status ? { status: queryOptions.status } : {}),
                    ...(queryOptions?.priority ? { priority: queryOptions.priority } : {})
                },
                include: {
                    createdOrganization: { select: { id: true, name: true, type: true } },
                    creator: { select: { id: true, name: true, email: true } },
                    parentProgram: {
                        select: {
                            id: true,
                            name: true,
                            createdOrganization: { select: { id: true, name: true, type: true } }
                        }
                    },
                    targetOrganizationUnits: {
                        include: { organization: { select: { id: true, name: true, type: true } } }
                    },
                    implementations: {
                        include: {
                            organization: { select: { id: true, name: true, type: true } },
                            acknowledgedByUser: { select: { id: true, name: true, email: true } }
                        }
                    },
                    _count: {
                        select: {
                            implementations: true,
                            subordinatePrograms: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" }
            });

            createdPrograms = created.map(p => {
                const totalRecipients = p.implementations.length;
                const acknowledgedCount = p.implementations.filter(i => i.isAcknowledged).length;
                const inProgressCount = p.implementations.filter(i => i.status === ProgramImplementationStatus.IN_PROGRESS).length;
                const completedCount = p.implementations.filter(i => i.status === ProgramImplementationStatus.COMPLETED).length;

                return {
                    ...p,
                    isCreatedByMe: true,
                    totalRecipients,
                    acknowledgedCount,
                    inProgressCount,
                    completedCount,
                    implementations: p.implementations
                };
            });
        }

        // 2. Incoming Programs received from higher tiers
        let receivedPrograms: any[] = [];
        if (tab === "all" || tab === "received") {
            const lineage = await HierarchyScopeService.getLineage(actorScope.id);
            const ancestorIds = lineage.map(u => u.id); // [unit, parent, grandParent, ..., federal]

            const incoming = await prisma.program.findMany({
                where: {
                    createdOrganizationId: { not: actorScope.id },
                    status: { in: [ProgramStatus.PUBLISHED, ProgramStatus.ACTIVE, ProgramStatus.COMPLETED] },
                    ...(queryOptions?.status ? { status: queryOptions.status } : {}),
                    ...(queryOptions?.priority ? { priority: queryOptions.priority } : {})
                },
                include: {
                    createdOrganization: { select: { id: true, name: true, type: true } },
                    creator: { select: { id: true, name: true, email: true } },
                    parentProgram: {
                        select: {
                            id: true,
                            name: true,
                            createdOrganization: { select: { id: true, name: true, type: true } }
                        }
                    },
                    targetOrganizationUnits: {
                        include: { organization: { select: { id: true, name: true, type: true } } }
                    },
                    implementations: {
                        where: { organizationId: actorScope.id },
                        include: {
                            acknowledgedByUser: { select: { id: true, name: true, email: true } }
                        }
                    }
                },
                orderBy: { startDate: "desc" }
            });

            // Filter strictly by target hierarchy & ancestor lineage
            const applicableIncoming = incoming.filter(p =>
                ProgramService.isAuthorizedRecipient(p, actorScope, ancestorIds)
            );

            // Ensure implementation record exists for incoming items
            receivedPrograms = await Promise.all(
                applicableIncoming.map(async p => {
                    let implementation = p.implementations[0] || null;
                    if (!implementation) {
                        implementation = await prisma.programImplementation.upsert({
                            where: {
                                programId_organizationId: {
                                    programId: p.id,
                                    organizationId: actorScope.id
                                }
                            },
                            create: {
                                programId: p.id,
                                organizationId: actorScope.id,
                                status: ProgramImplementationStatus.PENDING,
                                isAcknowledged: false
                            },
                            update: {},
                            include: {
                                acknowledgedByUser: { select: { id: true, name: true, email: true } }
                            }
                        });
                    }

                    return {
                        ...p,
                        isCreatedByMe: false,
                        userImplementation: implementation,
                        totalRecipients: 1
                    };
                })
            );
        }

        // Combine & apply search query filter
        let allPrograms = [...createdPrograms, ...receivedPrograms];

        if (queryOptions?.search && queryOptions.search.trim()) {
            const q = queryOptions.search.trim().toLowerCase();
            allPrograms = allPrograms.filter(
                p =>
                    p.name.toLowerCase().includes(q) ||
                    p.description.toLowerCase().includes(q) ||
                    p.objective.toLowerCase().includes(q) ||
                    p.createdOrganization.name.toLowerCase().includes(q)
            );
        }

        return allPrograms;
    }

    /**
     * Checks whether an organization is an authorized recipient of a program.
     */
    private static isAuthorizedRecipient(
        program: {
            createdOrganizationId: string;
            createdOrganization?: { type: OrganizationUnitType | string } | null;
            targetLevelAll: boolean;
            targetLevels: string[] | OrganizationUnitType[];
            cascadeDescendants: boolean;
            targetOrganizationUnits?: Array<{ organizationId: string }>;
        },
        actorScope: { id: string; type: OrganizationUnitType | string },
        ancestorIds: string[]
    ): boolean {
        const isAncestorCreator = ancestorIds.includes(program.createdOrganizationId) || program.createdOrganization?.type === "FEDERAL";
        if (!isAncestorCreator) return false;

        const parentAncestors = ancestorIds.filter(id => id !== actorScope.id);
        const targetedUnitIds = program.targetOrganizationUnits?.map(t => t.organizationId) || [];
        const matchesLevel = program.targetLevels.length === 0 || (program.targetLevels as string[]).includes(actorScope.type);

        // 1. Directly targeted to this organization unit
        if (targetedUnitIds.includes(actorScope.id)) {
            return matchesLevel;
        }

        // 2. Broadcast to all units under creator
        if (program.targetLevelAll && targetedUnitIds.length === 0) {
            return matchesLevel;
        }

        // 3. Cascaded from targeted ancestors
        if (program.cascadeDescendants && targetedUnitIds.length > 0) {
            const targetedAncestor = targetedUnitIds.some(tId => parentAncestors.includes(tId));
            if (targetedAncestor && matchesLevel) {
                return true;
            }
        }

        return false;
    }

    /**
     * Gets a single program with detailed lineage, recipient implementation tracking, and subordinate cascading.
     */
    static async getProgramById(
        id: string,
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        userId: string
    ) {
        if (!actorScope) {
            throw new Error("Unauthorized: Active organization scope is required.");
        }

        const program = await prisma.program.findUnique({
            where: { id },
            include: {
                createdOrganization: { select: { id: true, name: true, type: true, parentId: true } },
                creator: { select: { id: true, name: true, email: true } },
                parentProgram: {
                    include: {
                        createdOrganization: { select: { id: true, name: true, type: true } },
                        creator: { select: { id: true, name: true, email: true } }
                    }
                },
                subordinatePrograms: {
                    where: {
                        createdOrganizationId: { in: await HierarchyScopeService.getAccessibleOrganizationIds(actorScope.id) }
                    },
                    include: {
                        createdOrganization: { select: { id: true, name: true, type: true } },
                        creator: { select: { id: true, name: true, email: true } }
                    }
                },
                targetOrganizationUnits: {
                    include: { organization: { select: { id: true, name: true, type: true } } }
                },
                implementations: {
                    include: {
                        organization: { select: { id: true, name: true, type: true, parentId: true } },
                        acknowledgedByUser: { select: { id: true, name: true, email: true } }
                    },
                    orderBy: { createdAt: "asc" }
                }
            }
        });

        if (!program) {
            throw new Error(`Program with ID '${id}' not found.`);
        }

        // Scope access check
        const isCreator = program.createdOrganizationId === actorScope.id || (userId && program.createdBy === userId) || (actorScope.type === "FEDERAL" && program.createdOrganization.type === "FEDERAL");
        const lineage = await HierarchyScopeService.getLineage(actorScope.id);
        const ancestorIds = lineage.map(u => u.id);
        const accessibleIds = await HierarchyScopeService.getAccessibleOrganizationIds(actorScope.id);
        const isDescendantCreator = accessibleIds.includes(program.createdOrganizationId);
        const isRecipient = !isCreator && ProgramService.isAuthorizedRecipient(program, actorScope, ancestorIds);

        if (!isCreator && !isRecipient && !isDescendantCreator && actorScope.type !== "FEDERAL") {
            throw new Error("Forbidden: You do not have permission to access this program.");
        }

        // Current organization's implementation (only for recipient organizations, never for the creator)
        let userImplementation = null;
        if (!isCreator && isRecipient) {
            userImplementation = program.implementations.find(imp => imp.organizationId === actorScope.id) || null;
            if (!userImplementation) {
                userImplementation = await prisma.programImplementation.upsert({
                    where: {
                        programId_organizationId: {
                            programId: program.id,
                            organizationId: actorScope.id
                        }
                    },
                    create: {
                        programId: program.id,
                        organizationId: actorScope.id,
                        status: ProgramImplementationStatus.PENDING,
                        isAcknowledged: false
                    },
                    update: {},
                    include: {
                        organization: { select: { id: true, name: true, type: true, parentId: true } },
                        acknowledgedByUser: { select: { id: true, name: true, email: true } }
                    }
                });
            }
        }

        // Filter visible implementations to only those within actor's accessible scope
        const visibleImplementations = program.implementations.filter(
            imp => accessibleIds.includes(imp.organizationId) || imp.organizationId === actorScope.id
        );

        const totalRecipients = program.implementations.length;
        const acknowledgedCount = program.implementations.filter(i => i.isAcknowledged).length;
        const inProgressCount = program.implementations.filter(i => i.status === ProgramImplementationStatus.IN_PROGRESS).length;
        const completedCount = program.implementations.filter(i => i.status === ProgramImplementationStatus.COMPLETED).length;

        return {
            ...program,
            isCreatedByMe: isCreator,
            userImplementation,
            tracking: {
                totalRecipients,
                acknowledgedCount,
                inProgressCount,
                completedCount,
                implementations: visibleImplementations
            }
        };
    }

    /**
     * Acknowledges receipt of a program for the recipient organization.
     */
    static async acknowledgeProgram(
        id: string,
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        userId: string,
        notes?: string | null,
        ipAddress?: string
    ) {
        if (!actorScope) {
            throw new Error("Unauthorized: Active organization scope is required.");
        }
        if (!userId) {
            throw new Error("Unauthorized: User session required.");
        }

        const program = await prisma.program.findUnique({
            where: { id },
            include: {
                targetOrganizationUnits: true,
                createdOrganization: { select: { id: true, name: true, type: true } }
            }
        });
        if (!program) {
            throw new Error(`Program with ID '${id}' not found.`);
        }

        const lineage = await HierarchyScopeService.getLineage(actorScope.id);
        const ancestorIds = lineage.map(u => u.id);
        const isRecipient = ProgramService.isAuthorizedRecipient(program, actorScope, ancestorIds);
        if (!isRecipient) {
            throw new Error("Forbidden: This program is not targeted to your organization.");
        }

        const implementation = await prisma.programImplementation.upsert({
            where: {
                programId_organizationId: {
                    programId: id,
                    organizationId: actorScope.id
                }
            },
            create: {
                programId: id,
                organizationId: actorScope.id,
                isAcknowledged: true,
                acknowledgedAt: new Date(),
                acknowledgedByUserId: userId,
                status: ProgramImplementationStatus.ACKNOWLEDGED,
                notes: notes?.trim() || null
            },
            update: {
                isAcknowledged: true,
                acknowledgedAt: new Date(),
                acknowledgedByUserId: userId,
                status: ProgramImplementationStatus.ACKNOWLEDGED,
                notes: notes?.trim() !== undefined ? notes?.trim() : undefined
            },
            include: {
                organization: { select: { id: true, name: true, type: true } },
                acknowledgedByUser: { select: { id: true, name: true, email: true } }
            }
        });

        // Dispatch in-app notification to program creator / issuer
        try {
            if (prisma.notification?.create) {
                const creatorLink = program.createdOrganization?.type === "FEDERAL"
                    ? "/dashboard/federal?tab=programs"
                    : "/dashboard/programs";

                await prisma.notification.create({
                    data: {
                        userId: program.createdBy,
                        organizationId: program.createdOrganizationId,
                        title: `Program Acknowledged: ${program.name}`,
                        content: `${actorScope.name} has acknowledged receipt of "${program.name}". Remarks: ${notes?.trim() || "No remarks"}`,
                        link: creatorLink,
                        isRead: false
                    }
                });
            }
        } catch (notifErr) {
            console.warn("[ProgramService] Creator Notification creation failed:", notifErr);
        }

        // Audit Logging
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: actorScope.id,
                    userId,
                    action: "PROGRAM_ACKNOWLEDGED",
                    resource: "ProgramImplementation",
                    resourceId: implementation.id,
                    newValue: {
                        programId: id,
                        programName: program.name,
                        status: implementation.status,
                        notes: implementation.notes
                    },
                    ipAddress
                }
            });
        } catch (auditErr) {
            console.warn("[ProgramService] AuditLog creation failed:", auditErr);
        }

        return implementation;
    }

    /**
     * Updates implementation progress (e.g. IN_PROGRESS, COMPLETED, BLOCKED) and notes for the recipient organization.
     */
    static async updateImplementationStatus(
        id: string,
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        userId: string,
        input: UpdateImplementationStatusInput,
        ipAddress?: string
    ) {
        if (!actorScope) {
            throw new Error("Unauthorized: Active organization scope is required.");
        }
        if (!userId) {
            throw new Error("Unauthorized: User session required.");
        }
        if (!input.status) {
            throw new Error("Implementation status is required.");
        }

        const program = await prisma.program.findUnique({
            where: { id },
            include: {
                targetOrganizationUnits: true,
                createdOrganization: { select: { id: true, name: true, type: true } }
            }
        });
        if (!program) {
            throw new Error(`Program with ID '${id}' not found.`);
        }

        const lineage = await HierarchyScopeService.getLineage(actorScope.id);
        const ancestorIds = lineage.map(u => u.id);
        const isRecipient = ProgramService.isAuthorizedRecipient(program, actorScope, ancestorIds);
        if (!isRecipient) {
            throw new Error("Forbidden: This program is not targeted to your organization.");
        }

        const currentImp = await prisma.programImplementation.findUnique({
            where: {
                programId_organizationId: {
                    programId: id,
                    organizationId: actorScope.id
                }
            }
        });

        const startedAt = input.status === ProgramImplementationStatus.IN_PROGRESS
            ? (currentImp?.startedAt || new Date())
            : currentImp?.startedAt;

        const completedAt = input.status === ProgramImplementationStatus.COMPLETED
            ? (currentImp?.completedAt || new Date())
            : currentImp?.completedAt;

        const updated = await prisma.programImplementation.upsert({
            where: {
                programId_organizationId: {
                    programId: id,
                    organizationId: actorScope.id
                }
            },
            create: {
                programId: id,
                organizationId: actorScope.id,
                status: input.status,
                isAcknowledged: true,
                acknowledgedAt: new Date(),
                acknowledgedByUserId: userId,
                startedAt,
                completedAt,
                notes: input.notes?.trim() || null,
                submittedData: input.submittedData?.trim() || null
            },
            update: {
                status: input.status,
                isAcknowledged: true,
                acknowledgedAt: currentImp?.acknowledgedAt || new Date(),
                acknowledgedByUserId: currentImp?.acknowledgedByUserId || userId,
                startedAt,
                completedAt,
                notes: input.notes !== undefined ? (input.notes?.trim() || null) : undefined,
                submittedData: input.submittedData !== undefined ? (input.submittedData?.trim() || null) : undefined
            },
            include: {
                organization: { select: { id: true, name: true, type: true } },
                acknowledgedByUser: { select: { id: true, name: true, email: true } }
            }
        });

        // Dispatch in-app notification to program creator / issuer
        try {
            if (prisma.notification?.create) {
                const creatorLink = program.createdOrganization?.type === "FEDERAL"
                    ? "/dashboard/federal?tab=programs"
                    : "/dashboard/programs";

                const statusLabel = input.status.replace("_", " ");
                await prisma.notification.create({
                    data: {
                        userId: program.createdBy,
                        organizationId: program.createdOrganizationId,
                        title: `Program Status Update (${statusLabel}): ${program.name}`,
                        content: `${actorScope.name} updated implementation to ${statusLabel} for "${program.name}". Remarks: ${input.notes?.trim() || "No remarks"}`,
                        link: creatorLink,
                        isRead: false
                    }
                });
            }
        } catch (notifErr) {
            console.warn("[ProgramService] Creator Notification creation failed:", notifErr);
        }

        // Audit logging
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: actorScope.id,
                    userId,
                    action: "PROGRAM_IMPLEMENTATION_STATUS_UPDATED",
                    resource: "ProgramImplementation",
                    resourceId: updated.id,
                    oldValue: currentImp ? { status: currentImp.status, notes: currentImp.notes } : undefined,
                    newValue: {
                        programId: id,
                        programName: program.name,
                        status: updated.status,
                        notes: updated.notes
                    },
                    ipAddress
                }
            });
        } catch (auditErr) {
            console.warn("[ProgramService] AuditLog creation failed:", auditErr);
        }

        return updated;
    }

    /**
     * Updates program lifecycle status (PUBLISHED, ACTIVE, COMPLETED, CLOSED).
     * Only creator organization or Federal Admin can change program status.
     */
    static async updateProgramStatus(
        id: string,
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        userId: string,
        status: ProgramStatus,
        ipAddress?: string
    ) {
        if (!actorScope) {
            throw new Error("Unauthorized: Active organization scope is required.");
        }

        const program = await prisma.program.findUnique({
            where: { id },
            select: { id: true, name: true, status: true, createdOrganizationId: true }
        });
        if (!program) {
            throw new Error(`Program with ID '${id}' not found.`);
        }

        if (program.createdOrganizationId !== actorScope.id && actorScope.type !== "FEDERAL") {
            throw new Error("Forbidden: Only the issuing organization can change the program status.");
        }

        const updated = await prisma.program.update({
            where: { id },
            data: { status }
        });

        // Audit Log
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: actorScope.id,
                    userId,
                    action: "PROGRAM_STATUS_UPDATED",
                    resource: "Program",
                    resourceId: program.id,
                    oldValue: { status: program.status },
                    newValue: { status: updated.status },
                    ipAddress
                }
            });
        } catch (auditErr) {
            console.warn("[ProgramService] AuditLog creation failed:", auditErr);
        }

        return updated;
    }

    /**
     * Returns the recipients tree beneath the actor's scope for selection in creation UI.
     */
    static async getRecipientsTree(actorScope: { id: string; type: OrganizationUnitType; name: string } | null) {
        if (!actorScope) {
            throw new Error("Unauthorized: Active organization scope is required.");
        }

        const accessibleIds = await HierarchyScopeService.getAccessibleOrganizationIds(actorScope.id);
        const allUnits = await prisma.organizationUnit.findMany({
            where: { id: { in: accessibleIds } },
            select: { id: true, name: true, type: true, parentId: true },
            orderBy: { name: "asc" }
        });

        if (actorScope.type === "FEDERAL") {
            const regions = await prisma.organizationUnit.findMany({
                where: { type: "REGION" },
                select: {
                    id: true,
                    name: true,
                    type: true,
                    children: {
                        where: { type: "ZONE" },
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            children: {
                                where: { type: "WOREDA" },
                                select: {
                                    id: true,
                                    name: true,
                                    type: true,
                                    children: {
                                        where: { type: "SCHOOL" },
                                        select: { id: true, name: true, type: true }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { name: "asc" }
            });

            return {
                id: actorScope.id,
                name: actorScope.name,
                type: actorScope.type,
                actorTier: "FEDERAL",
                regions,
                units: allUnits
            };
        } else if (actorScope.type === "REGION") {
            const zones = await prisma.organizationUnit.findMany({
                where: { parentId: actorScope.id, type: "ZONE" },
                select: {
                    id: true,
                    name: true,
                    type: true,
                    children: {
                        where: { type: "WOREDA" },
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            children: {
                                where: { type: "SCHOOL" },
                                select: { id: true, name: true, type: true }
                            }
                        }
                    }
                },
                orderBy: { name: "asc" }
            });

            return {
                id: actorScope.id,
                name: actorScope.name,
                type: actorScope.type,
                actorTier: "REGION",
                zones,
                units: allUnits
            };
        } else if (actorScope.type === "ZONE") {
            const woredas = await prisma.organizationUnit.findMany({
                where: { parentId: actorScope.id, type: "WOREDA" },
                select: {
                    id: true,
                    name: true,
                    type: true,
                    children: {
                        where: { type: "SCHOOL" },
                        select: { id: true, name: true, type: true }
                    }
                },
                orderBy: { name: "asc" }
            });

            return {
                id: actorScope.id,
                name: actorScope.name,
                type: actorScope.type,
                actorTier: "ZONE",
                woredas,
                units: allUnits
            };
        } else if (actorScope.type === "WOREDA") {
            const schools = await prisma.organizationUnit.findMany({
                where: { parentId: actorScope.id, type: "SCHOOL" },
                select: { id: true, name: true, type: true },
                orderBy: { name: "asc" }
            });

            return {
                id: actorScope.id,
                name: actorScope.name,
                type: actorScope.type,
                actorTier: "WOREDA",
                schools,
                units: allUnits
            };
        }

        return {
            id: actorScope.id,
            name: actorScope.name,
            type: actorScope.type,
            actorTier: actorScope.type,
            units: allUnits
        };
    }
}
