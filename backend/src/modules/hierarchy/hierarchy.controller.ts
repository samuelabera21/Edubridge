import { Request, Response } from "express";
import { HierarchyService, HierarchyScopeService } from "./hierarchy.service.js";

export async function getHierarchyTreeHandler(req: Request, res: Response) {
    try {
        const rootId = req.query.rootId ? String(req.query.rootId) : undefined;
        const tree = await HierarchyService.getHierarchyTree(rootId);
        return res.status(200).json({
            success: true,
            data: tree
        });
    } catch (error: any) {
        console.error("Error in getHierarchyTreeHandler:", error);
        return res.status(error.message?.includes("not found") ? 404 : 500).json({
            success: false,
            message: error.message || "Failed to fetch hierarchy tree"
        });
    }
}

export async function getOrganizationUnitHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const unit = await HierarchyService.getOrganizationUnit(id);
        return res.status(200).json({
            success: true,
            data: unit
        });
    } catch (error: any) {
        console.error("Error in getOrganizationUnitHandler:", error);
        const status = error.message?.includes("not found") ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to fetch organization unit"
        });
    }
}

export async function getChildrenHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const children = await HierarchyService.getChildren(id);
        return res.status(200).json({
            success: true,
            data: children
        });
    } catch (error: any) {
        console.error("Error in getChildrenHandler:", error);
        const status = error.message?.includes("not found") ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to fetch child organization units"
        });
    }
}

export async function getAncestorsHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const ancestors = await HierarchyService.getAncestors(id);
        return res.status(200).json({
            success: true,
            data: ancestors
        });
    } catch (error: any) {
        console.error("Error in getAncestorsHandler:", error);
        const status = error.message?.includes("not found") ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to fetch organization ancestors"
        });
    }
}

async function resolveActorScope(req: Request) {
    if ((req as any).accessScope) {
        return (req as any).accessScope;
    }
    const userId = (req as any).user?.id;
    if (userId) {
        try {
            const scope = await HierarchyScopeService.getAccessibleOrganizationScope(userId);
            return scope.currentOrganization;
        } catch {
            return null;
        }
    }
    return null;
}

export async function createOrganizationUnitHandler(req: Request, res: Response) {
    try {
        const { name, type, parentId } = req.body;
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const newUnit = await HierarchyService.createOrganizationUnit(
            { name, type, parentId },
            actorScope,
            userId,
            ipAddress
        );

        return res.status(201).json({
            success: true,
            message: "Organization unit created successfully",
            data: newUnit
        });
    } catch (error: any) {
        console.error("Error in createOrganizationUnitHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isValidation = error.message?.includes("Invalid hierarchy") || error.message?.includes("required");
        const status = isForbidden ? 403 : isValidation ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to create organization unit"
        });
    }
}

export async function registerSchoolHandler(req: Request, res: Response) {
    try {
        const { name, woredaId, contactEmail, phoneNumber, address, establishedYear, adminUserId } = req.body;
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "School name is required."
            });
        }
        if (!woredaId) {
            return res.status(400).json({
                success: false,
                message: "Target woredaId is required."
            });
        }

        const registeredSchool = await HierarchyService.registerSchool(
            { name, woredaId, contactEmail, phoneNumber, address, establishedYear, adminUserId },
            actorScope,
            userId,
            ipAddress
        );

        return res.status(201).json({
            success: true,
            message: "School registered successfully under authorized Woreda.",
            data: registeredSchool
        });
    } catch (error: any) {
        console.error("Error in registerSchoolHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const isValidation = error.message?.includes("Invalid") || error.message?.includes("required");
        const status = isForbidden ? 403 : isNotFound ? 404 : isValidation ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to register school"
        });
    }
}

export async function updateOrganizationUnitHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const { name, parentId } = req.body;
        const actorScope = await resolveActorScope(req);

        const updated = await HierarchyService.updateOrganizationUnit(
            id,
            { name, parentId },
            actorScope
        );

        return res.status(200).json({
            success: true,
            message: "Organization unit updated successfully",
            data: updated
        });
    } catch (error: any) {
        console.error("Error in updateOrganizationUnitHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const isValidation = error.message?.includes("Invalid hierarchy") || error.message?.includes("cannot be empty");
        const status = isForbidden ? 403 : isNotFound ? 404 : isValidation ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to update organization unit"
        });
    }
}

export async function deleteOrganizationUnitHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const actorScope = await resolveActorScope(req);

        await HierarchyService.deleteOrganizationUnit(id, actorScope);

        return res.status(200).json({
            success: true,
            message: "Organization unit deleted successfully"
        });
    } catch (error: any) {
        console.error("Error in deleteOrganizationUnitHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const isConflict = error.message?.includes("Cannot delete");
        const status = isForbidden ? 403 : isNotFound ? 404 : isConflict ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to delete organization unit"
        });
    }
}

export async function placeSchoolHandler(req: Request, res: Response) {
    try {
        const schoolId = String(req.params.schoolId);
        const { woredaId } = req.body;
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        if (!woredaId) {
            return res.status(400).json({
                success: false,
                message: "Target woredaId is required in request body."
            });
        }

        const result = await HierarchyService.assignSchoolPlacement(
            schoolId,
            woredaId,
            actorScope,
            userId,
            ipAddress
        );

        return res.status(200).json({
            success: true,
            message: "School successfully placed under Woreda.",
            data: result
        });
    } catch (error: any) {
        console.error("Error in placeSchoolHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const isValidation = error.message?.includes("Invalid") || error.message?.includes("required");
        const status = isForbidden ? 403 : isNotFound ? 404 : isValidation ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to assign school placement"
        });
    }
}

export async function getLineageHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const lineage = await HierarchyScopeService.getLineage(id);
        return res.status(200).json({
            success: true,
            data: lineage
        });
    } catch (error: any) {
        console.error("Error in getLineageHandler:", error);
        const status = error.message?.includes("not found") ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to fetch organization lineage"
        });
    }
}

export async function getAccessibleScopeHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const scope = await HierarchyScopeService.getAccessibleOrganizationScope(userId);
        return res.status(200).json({
            success: true,
            data: scope
        });
    } catch (error: any) {
        console.error("Error in getAccessibleScopeHandler:", error);
        const isForbidden = error.message?.includes("No authorized");
        return res.status(isForbidden ? 403 : 500).json({
            success: false,
            message: error.message || "Failed to resolve accessible organization scope"
        });
    }
}

export async function getDescendantSchoolsHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const schools = await HierarchyScopeService.getDescendantSchoolIds(id);
        return res.status(200).json({
            success: true,
            data: schools
        });
    } catch (error: any) {
        console.error("Error in getDescendantSchoolsHandler:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to resolve descendant schools"
        });
    }
}

export async function getFederalOverviewHandler(req: Request, res: Response) {
    try {
        const data = await HierarchyService.getFederalOverview();
        return res.status(200).json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error("Error in getFederalOverviewHandler:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch Federal overview"
        });
    }
}

export async function getHierarchyDrilldownHandler(req: Request, res: Response) {
    try {
        const unitId = req.params.unitId ? String(req.params.unitId) : (req.query.unitId ? String(req.query.unitId) : undefined);
        const actorScope = await resolveActorScope(req);
        const data = await HierarchyService.getHierarchyDrilldown(unitId, actorScope);
        return res.status(200).json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error("Error in getHierarchyDrilldownHandler:", error);
        const isNotFound = error.message?.includes("not found");
        const isForbidden = error.message?.includes("Forbidden");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to fetch hierarchy drill-down data"
        });
    }
}

export async function assignRegionalAdminHandler(req: Request, res: Response) {
    try {
        const regionId = String(req.params.regionId);
        const { name, email, phone } = req.body;
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "Name and email are required to assign a Regional Administrator."
            });
        }

        const admin = await HierarchyService.assignRegionalAdmin(
            regionId,
            { name, email, phone },
            actorScope,
            userId,
            ipAddress
        );

        return res.status(200).json({
            success: true,
            message: `Invitation sent to ${email} for Regional Administrator role.`,
            data: admin
        });
    } catch (error: any) {
        console.error("Error in assignRegionalAdminHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to assign Regional Administrator"
        });
    }
}

export async function resendRegionalAdminInvitationHandler(req: Request, res: Response) {
    try {
        const regionId = String(req.params.regionId);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const result = await HierarchyService.resendRegionalAdminInvitation(
            regionId,
            actorScope,
            userId,
            ipAddress
        );

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("Error in resendRegionalAdminInvitationHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to resend invitation"
        });
    }
}

export async function cancelRegionalAdminInvitationHandler(req: Request, res: Response) {
    try {
        const regionId = String(req.params.regionId);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const result = await HierarchyService.cancelRegionalAdminInvitation(
            regionId,
            actorScope,
            userId,
            ipAddress
        );

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("Error in cancelRegionalAdminInvitationHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to cancel invitation"
        });
    }
}

export async function getRegionOverviewHandler(req: Request, res: Response) {
    try {
        const regionId = req.params.regionId ? String(req.params.regionId) : (req.query.regionId ? String(req.query.regionId) : undefined);
        const actorScope = await resolveActorScope(req);
        const overview = await HierarchyService.getRegionOverview(regionId, actorScope);
        return res.status(200).json({
            success: true,
            data: overview
        });
    } catch (error: any) {
        console.error("Error in getRegionOverviewHandler:", error);
        const isNotFound = error.message?.includes("not found");
        return res.status(isNotFound ? 404 : 500).json({
            success: false,
            message: error.message || "Failed to fetch Regional Overview"
        });
    }
}

export async function assignZoneAdminHandler(req: Request, res: Response) {
    try {
        const zoneId = String(req.params.zoneId);
        const { name, email, phone } = req.body;
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "Name and email are required to assign a Zone Administrator."
            });
        }

        const admin = await HierarchyService.assignZoneAdmin(
            zoneId,
            { name, email, phone },
            actorScope,
            userId,
            ipAddress
        );

        return res.status(200).json({
            success: true,
            message: `Invitation sent to ${email} for Zonal Administrator role.`,
            data: admin
        });
    } catch (error: any) {
        console.error("Error in assignZoneAdminHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to assign Zone Administrator"
        });
    }
}

export async function resendZoneAdminInvitationHandler(req: Request, res: Response) {
    try {
        const zoneId = String(req.params.zoneId);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const result = await HierarchyService.resendZoneAdminInvitation(
            zoneId,
            actorScope,
            userId,
            ipAddress
        );

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("Error in resendZoneAdminInvitationHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to resend invitation"
        });
    }
}

export async function cancelZoneAdminInvitationHandler(req: Request, res: Response) {
    try {
        const zoneId = String(req.params.zoneId);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const result = await HierarchyService.cancelZoneAdminInvitation(
            zoneId,
            actorScope,
            userId,
            ipAddress
        );

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("Error in cancelZoneAdminInvitationHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to cancel invitation"
        });
    }
}

export async function getZoneOverviewHandler(req: Request, res: Response) {
    try {
        const actorScope = await resolveActorScope(req);
        const zoneId = req.params.zoneId ? String(req.params.zoneId) : (req.query.zoneId ? String(req.query.zoneId) : undefined);
        const overview = await HierarchyService.getZoneOverview(zoneId, actorScope);

        return res.status(200).json({
            success: true,
            data: overview
        });
    } catch (error: any) {
        console.error("Error in getZoneOverviewHandler:", error);
        const isNotFound = error.message?.includes("not found");
        const status = isNotFound ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to fetch Zone Overview"
        });
    }
}

export async function assignWoredaAdminHandler(req: Request, res: Response) {
    try {
        const woredaId = String(req.params.woredaId);
        const { name, email, phone } = req.body;
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "Name and email are required to assign a Woreda Administrator."
            });
        }

        const admin = await HierarchyService.assignWoredaAdmin(
            woredaId,
            { name, email, phone },
            actorScope,
            userId,
            ipAddress
        );

        return res.status(200).json({
            success: true,
            message: `Invitation sent to ${email} for Woreda Administrator role.`,
            data: admin
        });
    } catch (error: any) {
        console.error("Error in assignWoredaAdminHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to assign Woreda Administrator"
        });
    }
}

export async function resendWoredaAdminInvitationHandler(req: Request, res: Response) {
    try {
        const woredaId = String(req.params.woredaId);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const result = await HierarchyService.resendWoredaAdminInvitation(
            woredaId,
            actorScope,
            userId,
            ipAddress
        );

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("Error in resendWoredaAdminInvitationHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to resend invitation"
        });
    }
}

export async function cancelWoredaAdminInvitationHandler(req: Request, res: Response) {
    try {
        const woredaId = String(req.params.woredaId);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const result = await HierarchyService.cancelWoredaAdminInvitation(
            woredaId,
            actorScope,
            userId,
            ipAddress
        );

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("Error in cancelWoredaAdminInvitationHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to cancel invitation"
        });
    }
}

export async function getWoredaOverviewHandler(req: Request, res: Response) {
    try {
        const actorScope = await resolveActorScope(req);
        const woredaId = req.params.woredaId ? String(req.params.woredaId) : (req.query.woredaId ? String(req.query.woredaId) : undefined);
        const overview = await HierarchyService.getWoredaOverview(woredaId, actorScope);

        return res.status(200).json({
            success: true,
            data: overview
        });
    } catch (error: any) {
        console.error("Error in getWoredaOverviewHandler:", error);
        const isNotFound = error.message?.includes("not found");
        const status = isNotFound ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to fetch Woreda Overview"
        });
    }
}

export async function assignSchoolAdminHandler(req: Request, res: Response) {
    try {
        const schoolId = String(req.params.schoolId);
        const { name, email, phone } = req.body;
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "Name and email are required to assign a School Principal."
            });
        }

        const admin = await HierarchyService.assignSchoolAdmin(
            schoolId,
            { name, email, phone },
            actorScope,
            userId,
            ipAddress
        );

        return res.status(200).json({
            success: true,
            message: `Invitation sent to ${email} for School Principal role.`,
            data: admin
        });
    } catch (error: any) {
        console.error("Error in assignSchoolAdminHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to assign School Principal"
        });
    }
}

export async function resendSchoolAdminInvitationHandler(req: Request, res: Response) {
    try {
        const schoolId = String(req.params.schoolId);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const result = await HierarchyService.resendSchoolAdminInvitation(
            schoolId,
            actorScope,
            userId,
            ipAddress
        );

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("Error in resendSchoolAdminInvitationHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to resend invitation"
        });
    }
}

export async function cancelSchoolAdminInvitationHandler(req: Request, res: Response) {
    try {
        const schoolId = String(req.params.schoolId);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const result = await HierarchyService.cancelSchoolAdminInvitation(
            schoolId,
            actorScope,
            userId,
            ipAddress
        );

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("Error in cancelSchoolAdminInvitationHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to cancel invitation"
        });
    }
}

