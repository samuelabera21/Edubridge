import { Request, Response } from "express";
import { HierarchyService } from "./hierarchy.service.js";

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

export async function createOrganizationUnitHandler(req: Request, res: Response) {
    try {
        const { name, type, parentId } = req.body;
        const actorScope = (req as any).accessScope || null;

        const newUnit = await HierarchyService.createOrganizationUnit(
            { name, type, parentId },
            actorScope
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

export async function updateOrganizationUnitHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const { name, parentId } = req.body;
        const actorScope = (req as any).accessScope || null;

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
        const actorScope = (req as any).accessScope || null;

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
