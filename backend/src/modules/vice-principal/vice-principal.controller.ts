import { Request, Response } from "express";
import { getAcademicOverview, getAttendanceOverview, getAssessmentOverview, getStudentSupportOverview, getTeacherSupportOverview, getCommunicationOverview, getAiInsights } from "./vice-principal.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";

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
import { getAcademicOrganizationYears as getYearsSvc, getAcademicOrganizationGrades as getGradesSvc, getAcademicOrganizationSections as getSectionsSvc } from "./vice-principal.service.js";

export async function getAcademicOrganizationYears(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }
        const years = await getYearsSvc(organizationId);
        res.json(years);
    } catch (error) {
        console.error("Error fetching academic organization years:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getAcademicOrganizationGrades(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id;
        const yearId = req.params.yearId as string;
        
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
        const schoolGradeId = req.params.schoolGradeId as string;
        
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

// ==========================================
// STEP 3: TEACHER ACADEMIC MANAGEMENT
// ==========================================
import { TeacherService } from "../teacher/teacher.service.js";

export async function getAcademicOrganizationTeachers(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const teachers = await TeacherService.getTeachers(organizationId);
        return res.json(teachers);
    } catch (error) {
        console.error("Error fetching academic organization teachers:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function getAcademicOrganizationTeacherAssignments(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const activeYear = await prisma.academicYear.findFirst({
            where: { organizationId, status: "ACTIVE" }
        });
        if (!activeYear) return res.json([]);

        const assignments = await TeacherService.getAssignments(organizationId, activeYear.id);
        return res.json(assignments);
    } catch (error) {
        console.error("Error fetching academic organization teacher assignments:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// ==========================================
// STEP 4: TEACHING ACTIVITY & LESSON CONTINUITY
// ==========================================

export async function getAcademicOrganizationTeachingActivity(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const activeYear = await prisma.academicYear.findFirst({
            where: { organizationId, status: "ACTIVE" }
        });
        if (!activeYear) return res.json({ scheduled: 0, completed: 0, missed: 0, lessons: [] });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = today.getDay();

        // 1. Fetch today's scheduled lessons from timetable
        const scheduledLessons = await prisma.timetable.findMany({
            where: { organizationId, academicYearId: activeYear.id, dayOfWeek },
            include: {
                classPeriod: true,
                teachingAssignment: {
                    include: {
                        teacher: true,
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true
                    }
                }
            },
            orderBy: { classPeriod: { startTime: 'asc' } }
        });

        // 2. Fetch teacher absences for today
        const teacherAbsencesToday = await prisma.teacherAttendance.findMany({
            where: { organizationId, date: today, status: "ABSENT" }
        });
        const absentTeacherIds = new Set(teacherAbsencesToday.map(a => a.teacherId));

        // 3. Map lessons and determine status
        let completed = 0;
        let missed = 0;

        const lessons = scheduledLessons.map(lesson => {
            const isMissed = absentTeacherIds.has(lesson.teachingAssignment.teacherId);
            if (isMissed) {
                missed++;
            } else {
                completed++;
            }

            return {
                id: lesson.id,
                period: lesson.classPeriod.name,
                time: `${lesson.classPeriod.startTime} - ${lesson.classPeriod.endTime}`,
                subject: lesson.teachingAssignment.subject.name,
                grade: lesson.teachingAssignment.schoolGrade.grade.name,
                section: lesson.teachingAssignment.section?.name || "N/A",
                teacher: `${lesson.teachingAssignment.teacher.firstName} ${lesson.teachingAssignment.teacher.lastName}`,
                status: isMissed ? "MISSED" : "COMPLETED",
                reason: isMissed ? "Teacher Absent" : null
            };
        });

        return res.json({
            scheduled: scheduledLessons.length,
            completed,
            missed,
            lessons
        });

    } catch (error) {
        console.error("Error fetching teaching activity:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// ==========================================
// STEP 5: CLASSROOM OBSERVATION & SUPERVISION
// ==========================================

export async function getAcademicOrganizationObservations(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const activeYear = await prisma.academicYear.findFirst({
            where: { organizationId, status: "ACTIVE" }
        });
        if (!activeYear) return res.json([]);

        const observations = await prisma.classroomObservation.findMany({
            where: { organizationId, academicYearId: activeYear.id },
            include: {
                teacher: true,
                subject: true,
                schoolGrade: { include: { grade: true } },
                section: true
            },
            orderBy: { date: 'desc' }
        });

        return res.json(observations);
    } catch (error) {
        console.error("Error fetching observations:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function scheduleClassroomObservation(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id;
        const observerId = req.user?.id;
        
        if (!organizationId || !observerId) {
            return res.status(403).json({ error: "Missing scope or authentication" });
        }

        const activeYear = await prisma.academicYear.findFirst({
            where: { organizationId, status: "ACTIVE" }
        });
        if (!activeYear) return res.status(400).json({ error: "No active academic year" });

        const { teacherId, subjectId, schoolGradeId, sectionId, date, topic } = req.body;
        
        const observation = await prisma.classroomObservation.create({
            data: {
                organizationId,
                academicYearId: activeYear.id,
                observerId,
                teacherId,
                subjectId,
                schoolGradeId,
                sectionId: sectionId || null,
                date: new Date(date),
                topic,
                status: "SCHEDULED"
            }
        });

        return res.json(observation);
    } catch (error) {
        console.error("Error scheduling observation:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function completeClassroomObservation(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const id = req.params.id as string;
        const { strengths, weaknesses, recommendations, feedback, followUpAction, followUpDate } = req.body;

        const observation = await prisma.classroomObservation.update({
            where: { id, organizationId },
            data: {
                strengths,
                weaknesses,
                recommendations,
                feedback,
                followUpAction,
                followUpDate: followUpDate ? new Date(followUpDate) : null,
                status: "COMPLETED"
            }
        });

        return res.json(observation);
    } catch (error) {
        console.error("Error completing observation:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

import { getAcademicAnomaliesStaffing as getStaffingSvc, getAcademicAnomaliesWorkload as getWorkloadSvc, getAcademicAnomaliesTimetable as getTimetableSvc } from "./vice-principal.service.js";

export async function getAcademicAnomaliesStaffing(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id as string;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const data = await getStaffingSvc(organizationId);
        res.json(data);
    } catch (error) {
        console.error("Error fetching staffing anomalies:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getAcademicAnomaliesWorkload(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id as string;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const data = await getWorkloadSvc(organizationId);
        res.json(data);
    } catch (error) {
        console.error("Error fetching workload anomalies:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getAcademicAnomaliesTimetable(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id as string;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const data = await getTimetableSvc(organizationId);
        res.json(data);
    } catch (error) {
        console.error("Error fetching timetable anomalies:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

import { getSchoolSubjects as getSubjectsSvc, getSectionStaffingView as getStaffingViewSvc, getAcademicCalendar as getCalendarSvc, getTimetableView as getTimetableViewSvc } from "./vice-principal.service.js";

export async function getSchoolSubjects(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id as string;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const data = await getSubjectsSvc(organizationId);
        res.json(data);
    } catch (error) {
        console.error("Error fetching subjects:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getSectionStaffingView(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id as string;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const sectionId = req.params.sectionId as string;
        const data = await getStaffingViewSvc(organizationId, sectionId);
        res.json(data);
    } catch (error) {
        console.error("Error fetching section staffing:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getAcademicCalendar(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id as string;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const data = await getCalendarSvc(organizationId);
        res.json(data);
    } catch (error) {
        console.error("Error fetching academic calendar:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getTimetableView(req: Request, res: Response) {
    try {
        const organizationId = (req as any).accessScope?.id as string;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const data = await getTimetableViewSvc(organizationId);
        res.json(data);
    } catch (error) {
        console.error("Error fetching timetable:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
