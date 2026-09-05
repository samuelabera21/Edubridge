import { prisma } from "../../infrastructure/prisma/client.js";
import { OrganizationUnitType, SchoolStatus } from "../../generated/prisma/enums.js";
import { Prisma } from "../../generated/prisma/client.js";

export async function getOrganizationHierarchy(rootId: string) {
    // Basic hierarchy fetching
    return prisma.organizationUnit.findUnique({
        where: { id: rootId },
        include: {
            children: true,
            schoolProfile: true,
        },
    });
}

export async function createOrganizationUnit(name: string, type: OrganizationUnitType, parentId?: string) {
    return prisma.organizationUnit.create({
        data: {
            name,
            type,
            parentId: parentId || null,
        },
    });
}

export async function getSchoolProfile(organizationId: string) {
    return prisma.schoolProfile.findUnique({
        where: { organizationId },
        include: {
            organization: true,
        },
    });
}

export async function updateSchoolProfile(
    organizationId: string,
    data: {
        schoolName?: string;
        establishedYear?: number;
        contactEmail?: string;
        phoneNumber?: string;
        address?: string;
        status?: SchoolStatus;
        configuration?: any;
    }
) {
    const profile = await prisma.schoolProfile.upsert({
        where: { organizationId },
        update: {
            establishedYear: data.establishedYear,
            contactEmail: data.contactEmail,
            phoneNumber: data.phoneNumber,
            address: data.address,
            status: data.status,
            configuration: data.configuration ? (data.configuration as Prisma.InputJsonValue) : undefined,
        },
        create: {
            organizationId,
            establishedYear: data.establishedYear,
            contactEmail: data.contactEmail,
            phoneNumber: data.phoneNumber,
            address: data.address,
            status: data.status || SchoolStatus.ACTIVE,
            configuration: data.configuration ? (data.configuration as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
    });

    if (data.schoolName) {
        await prisma.organizationUnit.update({
            where: { id: organizationId },
            data: { name: data.schoolName }
        });
    }
    
    return profile;
}

export async function getDashboardOverview(organizationId: string) {
    const totalStudents = await prisma.studentEnrollment.count({ where: { organizationId } });
    const maleStudents = await prisma.studentEnrollment.count({ where: { organizationId, student: { gender: "MALE" } } });
    const femaleStudents = await prisma.studentEnrollment.count({ where: { organizationId, student: { gender: "FEMALE" } } });
    const totalTeachers = await prisma.teacher.count({ where: { organizationId } });
    const totalAssignments = await prisma.teachingAssignment.count({ where: { teacher: { organizationId } } });
    const attendanceTotal = await prisma.studentAttendance.count({ where: { organizationId } });
    const attendancePresent = await prisma.studentAttendance.count({ where: { organizationId, status: "PRESENT" } });
    const totalAssessments = await prisma.assessment.count({ where: { organizationId } });
    const publishedAssessments = await prisma.assessment.count({ where: { organizationId, status: "PUBLISHED" } });
    const atRiskStudents = await prisma.interventionPlan.count({ where: { organizationId } });
    const activeSIP = await prisma.improvementPlan.count({ where: { organizationId } });

    const activeYear = await prisma.academicYear.findFirst({
        where: { organizationId, status: "ACTIVE" },
        include: {
            academicCalendar: {
                include: {
                    periods: {
                        orderBy: { startDate: "asc" }
                    }
                }
            }
        }
    });

    const activeYearName = activeYear ? activeYear.name : "Not Configured";
    const activePeriodName = activeYear?.academicCalendar?.periods?.[0]?.name || "Not Configured";

    const attendanceRate = attendanceTotal > 0 ? `${Math.round((attendancePresent / attendanceTotal) * 100)}%` : "0%";
    const teacherAvgWorkload = totalTeachers > 0 ? (totalAssignments / totalTeachers).toFixed(1) : "0.0";
    const genderRatio = totalStudents > 0 
        ? `${Math.round((femaleStudents / totalStudents) * 100)}% Female / ${Math.round((maleStudents / totalStudents) * 100)}% Male` 
        : "0% Female / 0% Male";
    const assessmentCompletion = totalAssessments > 0 
        ? `${Math.round((publishedAssessments / totalAssessments) * 100)}%` 
        : "0%";

    return {
        schoolOverview: {
            organizationId,
            status: activeYear ? "ACTIVE ACADEMIC OPERATIONS" : "SETUP REQUIRED",
            academicYear: activeYearName,
            activeTerm: activePeriodName
        },
        studentStats: {
            totalStudents,
            maleStudents,
            femaleStudents,
            genderRatio
        },
        teacherStats: {
            totalTeachers,
            totalAssignments,
            averageWorkload: `${teacherAvgWorkload} Subjects/Teacher`
        },
        attendanceOverview: {
            overallAttendanceRate: attendanceRate,
            presentRecords: attendancePresent,
            totalRecords: attendanceTotal
        },
        assessmentOverview: {
            totalAssessments,
            publishedAssessments,
            completionRate: assessmentCompletion
        },
        academicPerformance: {
            averageScore: totalAssessments > 0 ? "0%" : "N/A",
            topPerformersCount: 0,
            passRatio: totalAssessments > 0 ? "0%" : "N/A"
        },
        curriculumProgress: {
            completionRate: "0%",
            approvedLessonsCount: 0,
            pendingReviewCount: 0
        },
        studentSupportOverview: {
            atRiskCount: atRiskStudents,
            activeInterventions: atRiskStudents,
            recoveryRate: "0%"
        },
        schoolImprovementProgress: {
            activePlansCount: activeSIP,
            completedTargets: 0,
            resolutionRate: "0%"
        },
        importantAlerts: [],
        aiSchoolInsights: {
            overallStatus: activeYear ? "OPERATIONAL" : "CONFIGURATION PENDING",
            aiSummary: `System evaluated ${totalStudents} enrolled students across ${totalTeachers} active staff members for ${activeYearName}.`,
            confidenceScore: 1.0
        }
    };
}

