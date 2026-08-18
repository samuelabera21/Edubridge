import { prisma } from "../../infrastructure/prisma/client.js";

export class ParentService {
    static async createParent(data: { firstName: string; lastName: string; phoneNumber?: string; email?: string; userId?: string }) {
        return prisma.parent.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                phoneNumber: data.phoneNumber,
                email: data.email,
                userId: data.userId
            }
        });
    }

    static async getParents() {
        return prisma.parent.findMany({
            include: {
                children: {
                    include: {
                        student: {
                            include: {
                                enrollments: {
                                    include: {
                                        schoolGrade: { include: { grade: true } },
                                        section: true,
                                        academicYear: true
                                    },
                                    orderBy: { createdAt: "desc" },
                                    take: 1
                                }
                            }
                        }
                    }
                },
                user: true
            },
            orderBy: { createdAt: "desc" }
        });
    }

    static async linkParentToStudent(data: { parentId: string; studentId: string; relationship: string; isPrimary?: boolean; canPickup?: boolean }) {
        const parent = await prisma.parent.findUnique({ where: { id: data.parentId } });
        if (!parent) throw new Error("Parent not found");

        const student = await prisma.student.findUnique({ where: { id: data.studentId } });
        if (!student) throw new Error("Student not found");

        return prisma.parentStudent.upsert({
            where: {
                parentId_studentId: {
                    parentId: data.parentId,
                    studentId: data.studentId
                }
            },
            update: {
                relationship: data.relationship,
                isPrimary: data.isPrimary ?? true,
                canPickup: data.canPickup ?? true
            },
            create: {
                parentId: data.parentId,
                studentId: data.studentId,
                relationship: data.relationship,
                isPrimary: data.isPrimary ?? true,
                canPickup: data.canPickup ?? true
            }
        });
    }

    static async unlinkParentFromStudent(parentId: string, studentId: string) {
        return prisma.parentStudent.delete({
            where: {
                parentId_studentId: {
                    parentId,
                    studentId
                }
            }
        });
    }

    static async getStudentParents(studentId: string) {
        return prisma.parentStudent.findMany({
            where: { studentId },
            include: { parent: true }
        });
    }

    static async getParentProfileByUserId(userId: string) {
        const parent = await prisma.parent.findFirst({
            where: { userId },
            include: {
                children: {
                    include: {
                        student: {
                            include: {
                                enrollments: {
                                    include: {
                                        schoolGrade: { include: { grade: true } },
                                        section: true,
                                        academicYear: true
                                    },
                                    orderBy: { createdAt: "desc" },
                                    take: 1
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!parent) throw new Error("Parent profile not found for user");
        return parent;
    }
}
