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
        establishedYear?: number;
        contactEmail?: string;
        phoneNumber?: string;
        address?: string;
        status?: SchoolStatus;
        configuration?: any;
    }
) {
    return prisma.schoolProfile.upsert({
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
}
