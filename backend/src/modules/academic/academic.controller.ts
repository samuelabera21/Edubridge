import { Request, Response } from "express";
import { AcademicService } from "./academic.service.js";

export const getAcademicYears = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }
        const years = await AcademicService.getAcademicYears(organizationId);
        res.json(years);
    } catch (error) {
        console.error("Error fetching academic years:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const createAcademicYear = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }
        
        const year = await AcademicService.createAcademicYear(organizationId, req.body);
        res.status(201).json(year);
    } catch (error) {
        console.error("Error creating academic year:", error);
        res.status(400).json({ error: "Invalid request or duplicate academic year" });
    }
};

export const getGrades = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }
        const grades = await AcademicService.getGrades(organizationId);
        res.json(grades);
    } catch (error) {
        console.error("Error fetching grades:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getSchoolGrades = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const { yearId } = req.params;
        const schoolGrades = await AcademicService.getSchoolGrades(organizationId, yearId);
        res.json(schoolGrades);
    } catch (error) {
        console.error("Error fetching school grades:", error);
        res.status(404).json({ error: "Academic year not found or access denied" });
    }
};

export const getSections = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const { schoolGradeId } = req.params;
        const sections = await AcademicService.getSections(organizationId, schoolGradeId);
        res.json(sections);
    } catch (error) {
        console.error("Error fetching sections:", error);
        res.status(404).json({ error: "Grade not found or access denied" });
    }
};

export const getSubjects = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }
        const subjects = await AcademicService.getSubjects(organizationId);
        res.json(subjects);
    } catch (error) {
        console.error("Error fetching subjects:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
