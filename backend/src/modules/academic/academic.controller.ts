import { Request, Response } from "express";
import { AcademicService } from "./academic.service.js";

// Helper for Prisma unique constraint errors
const handlePrismaError = (error: any, res: Response, fallbackMessage: string) => {
    if (error?.code === 'P2002') {
        const fields = error.meta?.target || "record";
        return res.status(400).json({ error: `This ${fields} already exists.` });
    }
    return res.status(400).json({ error: error?.message || fallbackMessage });
};

// --- Academic Years ---
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
    } catch (error: any) {
        handlePrismaError(error, res, "Invalid request or duplicate academic year");
    }
};

export const getAcademicYearById = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }
        
        const year = await AcademicService.getAcademicYearById(organizationId, req.params.yearId as string);
        res.json(year);
    } catch (error: any) {
        if (error.message === "Academic Year not found") {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: "Internal server error" });
    }
};

export const updateAcademicYear = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }
        
        const year = await AcademicService.updateAcademicYear(organizationId, req.params.yearId as string, req.body);
        res.json(year);
    } catch (error: any) {
        handlePrismaError(error, res, "Invalid request or duplicate academic year name");
    }
};

export const copyStructureFromPreviousYear = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const result = await AcademicService.copyStructureFromPreviousYear(
            organizationId, 
            req.params.yearId as string, 
            req.body.previousYearId as string
        );
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message || "Failed to copy structure" });
    }
};

export const activateAcademicYear = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const year = await AcademicService.activateAcademicYear(organizationId, req.params.yearId as string);
        res.json(year);
    } catch (error) {
        console.error("Error activating academic year:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const createAcademicCalendar = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const calendar = await AcademicService.createAcademicCalendar(req.params.yearId as string, req.body.description);
        res.status(201).json(calendar);
    } catch (error: any) {
        handlePrismaError(error, res, "Invalid request");
    }
};

export const createAcademicPeriod = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const period = await AcademicService.createAcademicPeriod(req.params.calendarId as string, req.body);
        res.status(201).json(period);
    } catch (error: any) {
        handlePrismaError(error, res, "Invalid request");
    }
};

// --- Grades & Sections ---
export const getGrades = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const grades = await AcademicService.getGrades(organizationId);
        res.json(grades);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};

export const createGrade = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const grade = await AcademicService.createGrade(organizationId, req.body);
        res.status(201).json(grade);
    } catch (error: any) {
        handlePrismaError(error, res, "Invalid request");
    }
};

export const getSchoolGrades = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const schoolGrades = await AcademicService.getSchoolGrades(organizationId, req.params.yearId as string);
        res.json(schoolGrades);
    } catch (error) {
        res.status(404).json({ error: "Academic year not found or access denied" });
    }
};

export const createSchoolGrade = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const sg = await AcademicService.createSchoolGrade(req.params.yearId as string, req.body.gradeId);
        res.status(201).json(sg);
    } catch (error: any) {
        handlePrismaError(error, res, "Invalid request");
    }
};

export const getSchoolGradeDetails = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const details = await AcademicService.getSchoolGradeDetails(organizationId, req.params.schoolGradeId as string);
        res.json(details);
    } catch (error: any) {
        if (error.message === "School Grade not found or unauthorized") {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getSections = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const sections = await AcademicService.getSections(organizationId, req.params.schoolGradeId as string);
        res.json(sections);
    } catch (error) {
        res.status(404).json({ error: "Grade not found or access denied" });
    }
};

export const createSection = async (req: Request, res: Response) => {
    try {
        console.log("createSection START", req.params.schoolGradeId, req.body);
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            console.log("createSection NO ORG ID");
            return res.status(403).json({ error: "Missing school scope" });
        }
        
        console.log("Calling AcademicService.createSection");
        const section = await AcademicService.createSection(req.params.schoolGradeId as string, req.body.name, req.body.capacity);
        console.log("createSection SUCCESS", section);
        res.status(201).json(section);
    } catch (error: any) {
        console.error("createSection ERROR:", error);
        handlePrismaError(error, res, "Invalid request or a section with this name already exists");
    }
};

// --- Subjects ---
export const getSubjects = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const subjects = await AcademicService.getSubjects(organizationId);
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};

export const createSubject = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const subject = await AcademicService.createSubject(organizationId, req.body);
        res.status(201).json(subject);
    } catch (error: any) {
        handlePrismaError(error, res, "Invalid request");
    }
};

export const createSchoolSubject = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const ss = await AcademicService.createSchoolSubject(req.params.yearId as string, req.body.subjectId);
        res.status(201).json(ss);
    } catch (error: any) {
        handlePrismaError(error, res, "Invalid request");
    }
};
