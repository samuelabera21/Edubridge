import { prisma } from "../../infrastructure/prisma/client.js";

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
    }
) {
    return prisma.schoolProfile.upsert({
        where: { organizationId },
        update: {
            establishedYear: data.establishedYear,
            contactEmail: data.contactEmail,
            phoneNumber: data.phoneNumber,
            address: data.address,
        },
        create: {
            organizationId,
            establishedYear: data.establishedYear,
            contactEmail: data.contactEmail,
            phoneNumber: data.phoneNumber,
            address: data.address,
        },
    });
}
