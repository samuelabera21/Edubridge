import { Request, Response } from "express";
import { getSchoolProfile, updateSchoolProfile, createOrganizationUnit, getOrganizationHierarchy } from "./school.service.js";
import { OrganizationUnitType, SchoolStatus } from "../../generated/prisma/enums.js";
import { prisma } from "../../infrastructure/prisma/client.js";

export async function getHierarchyHandler(req: Request, res: Response) {
    try {
        const accessScope = (req as any).accessScope;
        if (!accessScope) {
            return res.status(403).json({ message: "Invalid or missing scope" });
        }
        const hierarchy = await getOrganizationHierarchy(accessScope.id);
        return res.json(hierarchy);
    } catch (error) {
        console.error("Error getting hierarchy:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function createOrganizationHandler(req: Request, res: Response) {
    try {
        const { name, type, parentId } = req.body;
        if (!name || !type) {
            return res.status(400).json({ message: "Name and type are required" });
        }
        
        // Basic validation: user can only create an org under their scope if authorized.
        const accessScope = (req as any).accessScope;
        if (!accessScope) {
            return res.status(403).json({ message: "Invalid or missing scope" });
        }

        const newOrg = await createOrganizationUnit(name, type as OrganizationUnitType, parentId);
        return res.status(201).json(newOrg);
    } catch (error) {
        console.error("Error creating organization:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function getProfileHandler(req: Request, res: Response) {
    try {
        const accessScope = (req as any).accessScope;
        if (!accessScope || accessScope.type !== "SCHOOL") {
            return res.status(403).json({ message: "Invalid or missing school scope" });
        }

        const profile = await getSchoolProfile(accessScope.id);
        
        // Fetch aggregated stats
        const activeYear = await prisma.academicYear.findFirst({
            where: { organizationId: accessScope.id, status: "ACTIVE" }
        });

        const [totalTeachers, totalStudents, activeSections, academicYears] = await Promise.all([
            prisma.teacher.count({ where: { organizationId: accessScope.id } }),
            prisma.student.count({ where: { enrollments: { some: { organizationId: accessScope.id } } } }),
            activeYear ? prisma.section.count({ where: { schoolGrade: { academicYearId: activeYear.id } } }) : 0,
            prisma.academicYear.findMany({ where: { organizationId: accessScope.id }, orderBy: { startDate: 'desc' } })
        ]);
        
        return res.json({
            school: accessScope,
            profile: profile || null,
            academicYears,
            stats: {
                totalTeachers,
                totalStudents,
                activeSections
            }
        });
    } catch (error) {
        console.error("Error getting school profile:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function updateProfileHandler(req: Request, res: Response) {
    try {
        const accessScope = (req as any).accessScope;
        if (!accessScope || accessScope.type !== "SCHOOL") {
            return res.status(403).json({ message: "Invalid or missing school scope" });
        }

        const data = req.body;
        const profile = await updateSchoolProfile(accessScope.id, {
            schoolName: data.schoolName,
            establishedYear: data.establishedYear,
            contactEmail: data.contactEmail,
            phoneNumber: data.phoneNumber,
            address: data.address,
            status: data.status as SchoolStatus,
            configuration: data.configuration,
        });

        if (data.activeAcademicYearId) {
            // Set all to COMPLETED
            await prisma.academicYear.updateMany({
                where: { organizationId: accessScope.id, id: { not: data.activeAcademicYearId } },
                data: { status: "COMPLETED" }
            });
            // Set selected to ACTIVE
            await prisma.academicYear.update({
                where: { id: data.activeAcademicYearId },
                data: { status: "ACTIVE" }
            });
        }

        return res.json({
            message: "Profile updated successfully",
            profile,
        });
    } catch (error) {
        console.error("Error updating school profile:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


