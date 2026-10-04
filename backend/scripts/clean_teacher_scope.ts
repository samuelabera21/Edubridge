import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const teacher = await prisma.teacher.findFirst();
    console.log("Teacher in DB:", {
        id: teacher?.id,
        name: `${teacher?.firstName} ${teacher?.lastName}`,
        organizationId: teacher?.organizationId,
        userId: teacher?.userId
    });

    // Remove obsolete / wrong scope role assignments for this teacher
    if (teacher?.userId && teacher.organizationId) {
        await prisma.roleAssignment.deleteMany({
            where: {
                userId: teacher.userId,
                scopeId: { not: teacher.organizationId }
            }
        });

        // Ensure teacher has role assignment for their real school
        const teacherRole = await prisma.role.findUnique({ where: { name: "TEACHER" } });
        if (teacherRole) {
            const existing = await prisma.roleAssignment.findFirst({
                where: {
                    userId: teacher.userId,
                    scopeId: teacher.organizationId,
                    roleId: teacherRole.id
                }
            });
            if (!existing) {
                await prisma.roleAssignment.create({
                    data: {
                        userId: teacher.userId,
                        scopeId: teacher.organizationId,
                        roleId: teacherRole.id
                    }
                });
            }
        }
    }

    const updatedUser = await prisma.user.findUnique({
        where: { email: "tch.2026.0013@edubridge.local" },
        include: { roleAssignments: { include: { scope: true, role: true } } }
    });

    console.log("Teacher Role Assignments NOW:", updatedUser?.roleAssignments.map(ra => ({
        role: ra.role.name,
        scopeName: ra.scope?.name,
        scopeId: ra.scopeId
    })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
