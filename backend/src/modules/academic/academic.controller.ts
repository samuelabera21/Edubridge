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
        if (error.message === "Academic Year not found") {
            return res.status(404).json({ error: error.message });
        }
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
    } catch (error: any) {
        if (error.message === "Academic Year not found") {
            return res.status(404).json({ error: error.message });
        }
        res.status(400).json({ error: error.message || "Failed to activate academic year" });
    }
};

// --- Academic Calendars & Periods ---
export const getAcademicCalendar = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const calendar = await AcademicService.getAcademicCalendar(organizationId, req.params.yearId as string);
        res.json(calendar);
    } catch (error: any) {
        res.status(404).json({ error: error.message || "Academic year not found" });
    }
};

export const createAcademicCalendar = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const calendar = await AcademicService.createAcademicCalendar(
            organizationId,
            req.params.yearId as string,
            req.body.description
        );
        res.status(201).json(calendar);
    } catch (error: any) {
        handlePrismaError(error, res, "Invalid request");
    }
};

export const getAcademicPeriods = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const periods = await AcademicService.getAcademicPeriods(organizationId, req.params.calendarId as string);
        res.json(periods);
    } catch (error: any) {
        res.status(404).json({ error: error.message || "Calendar not found" });
    }
};

export const createAcademicPeriod = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const period = await AcademicService.createAcademicPeriod(
            organizationId,
            req.params.calendarId as string,
            req.body
        );
        res.status(201).json(period);
    } catch (error: any) {
        handlePrismaError(error, res, error.message || "Invalid request");
    }
};

export const updateAcademicPeriod = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const period = await AcademicService.updateAcademicPeriod(
            organizationId,
            req.params.periodId as string,
            req.body
        );
        res.json(period);
    } catch (error: any) {
        handlePrismaError(error, res, error.message || "Invalid request");
    }
};

export const deleteAcademicPeriod = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        await AcademicService.deleteAcademicPeriod(organizationId, req.params.periodId as string);
        res.json({ message: "Academic period deleted successfully" });
    } catch (error: any) {
        res.status(400).json({ error: error.message || "Failed to delete academic period" });
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
        handlePrismaError(error, res, error.message || "Invalid request");
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
        
        const sg = await AcademicService.createSchoolGrade(
            organizationId,
            req.params.yearId as string,
            req.body.gradeId
        );
        res.status(201).json(sg);
    } catch (error: any) {
        handlePrismaError(error, res, error.message || "Invalid request");
    }
};

export const deleteSchoolGrade = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        await AcademicService.deleteSchoolGrade(organizationId, req.params.schoolGradeId as string);
        res.json({ message: "School grade removed successfully from this academic year" });
    } catch (error: any) {
        res.status(400).json({ error: error.message || "Failed to remove school grade" });
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
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }
        
        const section = await AcademicService.createSection(
            organizationId,
            req.params.schoolGradeId as string,
            req.body.name,
            req.body.capacity
        );
        res.status(201).json(section);
    } catch (error: any) {
        handlePrismaError(error, res, error.message || "Invalid request or section already exists");
    }
};

export const updateSection = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const section = await AcademicService.updateSection(
            organizationId,
            req.params.sectionId as string,
            req.body
        );
        res.json(section);
    } catch (error: any) {
        handlePrismaError(error, res, error.message || "Invalid request");
    }
};

export const deleteSection = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        await AcademicService.deleteSection(organizationId, req.params.sectionId as string);
        res.json({ message: "Section deleted successfully" });
    } catch (error: any) {
        res.status(400).json({ error: error.message || "Failed to delete section" });
    }
};

// --- Subjects Master & Academic Year Offerings ---
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
        handlePrismaError(error, res, error.message || "Invalid request");
    }
};

export const getSchoolSubjects = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const schoolSubjects = await AcademicService.getSchoolSubjects(organizationId, req.params.yearId as string);
        res.json(schoolSubjects);
    } catch (error: any) {
        res.status(404).json({ error: error.message || "Academic year not found" });
    }
};

export const createSchoolSubject = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        
        const ss = await AcademicService.createSchoolSubject(
            organizationId,
            req.params.yearId as string,
            req.body.subjectId
        );
        res.status(201).json(ss);
    } catch (error: any) {
        handlePrismaError(error, res, error.message || "Invalid request");
    }
};

export const deleteSchoolSubject = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        await AcademicService.deleteSchoolSubject(
            organizationId,
            req.params.yearId as string,
            req.params.subjectId as string
        );
        res.json({ message: "Subject removed from academic year" });
    } catch (error: any) {
        res.status(400).json({ error: error.message || "Failed to remove subject" });
    }
};

// --- Grade-Specific Curriculum & Weekly Periods ---
export const getSchoolGradeSubjects = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const gradeSubjects = await AcademicService.getSchoolGradeSubjects(
            organizationId,
            req.params.schoolGradeId as string
        );
        res.json(gradeSubjects);
    } catch (error: any) {
        res.status(404).json({ error: error.message || "Grade not found" });
    }
};

export const assignSubjectToGrade = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const gradeSubject = await AcademicService.assignSubjectToGrade(
            organizationId,
            req.params.schoolGradeId as string,
            req.body.subjectId,
            req.body.weeklyPeriods
        );
        res.status(201).json(gradeSubject);
    } catch (error: any) {
        handlePrismaError(error, res, error.message || "Invalid request");
    }
};

export const removeSubjectFromGrade = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        await AcademicService.removeSubjectFromGrade(
            organizationId,
            req.params.schoolGradeId as string,
            req.params.subjectId as string
        );
        res.json({ message: "Subject removed from grade" });
    } catch (error: any) {
        res.status(400).json({ error: error.message || "Failed to remove subject from grade" });
    }
};
