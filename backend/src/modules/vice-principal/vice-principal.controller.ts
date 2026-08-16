import { Request, Response } from "express";
import { getAcademicOverview, getAttendanceOverview, getAssessmentOverview, getStudentSupportOverview, getTeacherSupportOverview, getCommunicationOverview, getAiInsights } from "./vice-principal.service.js";

// Get the currently logged in Vice Principal's overview profile
export async function getVicePrincipalProfile(req: Request, res: Response) {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

        const accessScope = (req as any).accessScope;
        if (!accessScope || accessScope.type !== "SCHOOL") {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const overview = await getAcademicOverview(accessScope.id);
        
        return res.json({
            school: accessScope,
            overview: overview,
            role: "VICE_PRINCIPAL",
        });
    } catch (error) {
        console.error("Error fetching VP profile:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function getAttendanceDashboard(req: Request, res: Response) {
    try {
        const accessScope = (req as any).accessScope;
        if (!accessScope || accessScope.type !== "SCHOOL") {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const data = await getAttendanceOverview(accessScope.id);
        return res.json(data);
    } catch (error) {
        console.error("Error fetching attendance overview:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function getAssessmentDashboard(req: Request, res: Response) {
    try {
        const accessScope = (req as any).accessScope;
        if (!accessScope || accessScope.type !== "SCHOOL") {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const data = await getAssessmentOverview(accessScope.id);
        return res.json(data);
    } catch (error) {
        console.error("Error fetching assessment overview:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function getStudentSupportDashboard(req: Request, res: Response) {
    try {
        const accessScope = (req as any).accessScope;
        if (!accessScope || accessScope.type !== "SCHOOL") {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const data = await getStudentSupportOverview(accessScope.id);
        return res.json(data);
    } catch (error) {
        console.error("Error fetching student support overview:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function getTeacherSupportDashboard(req: Request, res: Response) {
    try {
        const accessScope = (req as any).accessScope;
        if (!accessScope || accessScope.type !== "SCHOOL") {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const data = await getTeacherSupportOverview(accessScope.id);
        return res.json(data);
    } catch (error) {
        console.error("Error fetching teacher support overview:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function getCommunicationDashboard(req: Request, res: Response) {
    try {
        const accessScope = (req as any).accessScope;
        if (!accessScope || accessScope.type !== "SCHOOL") {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const data = await getCommunicationOverview(accessScope.id);
        return res.json(data);
    } catch (error) {
        console.error("Error fetching communication overview:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function getAiInsightsDashboard(req: Request, res: Response) {
    try {
        const accessScope = (req as any).accessScope;
        if (!accessScope || accessScope.type !== "SCHOOL") {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const data = await getAiInsights(accessScope.id);
        return res.json(data);
    } catch (error) {
        console.error("Error fetching AI insights:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// ==========================================
// STEP 2: ACADEMIC ORGANIZATION
// ==========================================
import { getAcademicOrganizationGrades as getGradesSvc, getAcademicOrganizationSections as getSectionsSvc } from "./vice-principal.service.js";

export async function getAcademicOrganizationGrades(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id;
        const yearId = req.params.yearId;
        
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }
        
        const grades = await getGradesSvc(organizationId, yearId);
        res.json(grades);
    } catch (error) {
        console.error("Error fetching academic organization grades:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getAcademicOrganizationSections(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id;
        const schoolGradeId = req.params.schoolGradeId;
        
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }
        
        const sections = await getSectionsSvc(organizationId, schoolGradeId);
        res.json(sections);
    } catch (error) {
        console.error("Error fetching academic organization sections:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
