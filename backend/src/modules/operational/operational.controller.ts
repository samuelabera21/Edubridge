import { Request, Response } from "express";
import { OperationalService } from "./operational.service.js";
import { ResourceType, IssuePriority, IssueStatus } from "../../generated/prisma/enums.js";

export const createResource = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { name, type, capacity, status, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: "name is required" });
        }

        const resource = await OperationalService.createResource(organizationId, {
            name,
            type: type as ResourceType || ResourceType.CLASSROOM,
            capacity,
            status,
            description
        });

        return res.status(201).json(resource);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create resource" });
    }
};

export const getResources = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const resources = await OperationalService.getResources(organizationId);
        return res.json(resources);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const reportIssue = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const reportedById = req.user?.id;
        if (!reportedById) return res.status(401).json({ error: "Unauthorized" });

        const { title, description, priority, resourceId } = req.body;
        if (!title || !description) {
            return res.status(400).json({ error: "title and description are required" });
        }

        const issue = await OperationalService.reportIssue(organizationId, { 
            title, 
            description, 
            priority: priority as IssuePriority, 
            reportedById, 
            resourceId 
        });
        
        return res.status(201).json(issue);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to report issue" });
    }
};

export const getIssues = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { status } = req.query;

        const issues = await OperationalService.getIssues(organizationId, status as IssueStatus);
        return res.json(issues);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const updateIssueStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, assignedToId } = req.body;
        
        if (!status) {
            return res.status(400).json({ error: "status is required" });
        }

        const issue = await OperationalService.updateIssueStatus(id as string, status as IssueStatus, assignedToId);
        return res.json(issue);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to update issue status" });
    }
};

export const createImprovementPlan = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { title, description, objectives, startDate, endDate } = req.body;
        
        if (!title || !description || !objectives || !startDate) {
            return res.status(400).json({ error: "title, description, objectives, and startDate are required" });
        }

        const plan = await OperationalService.createImprovementPlan(organizationId, {
            title, description, objectives, startDate, endDate
        });

        return res.status(201).json(plan);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create improvement plan" });
    }
};

export const getImprovementPlans = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const plans = await OperationalService.getImprovementPlans(organizationId);
        return res.json(plans);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};
