import { prisma } from "../../infrastructure/prisma/client.js";

export async function getUserAccess(userId: string) {
    const assignments = await prisma.roleAssignment.findMany({
        where: { userId },
        include: {
            role: {
                include: {
                    permissions: {
                        include: {
                            permission: true,
                        },
                    },
                },
            },
            scope: true,
        },
    });

    return assignments;
}

export async function assignRoleToUser(
    userId: string,
    roleName: string,
    scopeName: string,
    scopeType: "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL"
) {
    const role = await prisma.role.upsert({
        where: {
            name: roleName,
        },
        update: {},
        create: {
            name: roleName,
        },
    });

    let scope = await prisma.organizationUnit.findFirst({
        where: {
            name: scopeName,
            type: scopeType,
        },
    });

    if (!scope) {
        scope = await prisma.organizationUnit.create({
            data: {
                name: scopeName,
                type: scopeType,
            },
        });
    }

    return prisma.roleAssignment.upsert({
        where: {
            userId_roleId_scopeId: {
                userId,
                roleId: role.id,
                scopeId: scope.id,
            },
        },
        update: {},
        create: {
            userId,
            roleId: role.id,
            scopeId: scope.id,
        },
        include: {
            role: true,
            scope: true,
        },
    });
}

export async function assignPermissionToRole(
    roleName: string,
    permissionName: string,
    description?: string
) {
    const role = await prisma.role.findUnique({
        where: { name: roleName },
    });

    if (!role) {
        throw new Error(`Role '${roleName}' not found`);
    }

    const permission = await prisma.permission.upsert({
        where: { name: permissionName },
        update: {},
        create: {
            name: permissionName,
            description: description ?? null,
        },
    });

    return prisma.rolePermission.upsert({
        where: {
            roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id,
            },
        },
        update: {},
        create: {
            roleId: role.id,
            permissionId: permission.id,
        },
        include: {
            role: true,
            permission: true,
        },
    });
}