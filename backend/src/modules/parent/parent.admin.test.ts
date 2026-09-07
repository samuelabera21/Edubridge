import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../../infrastructure/prisma/client.js";
import { ParentService } from "./parent.service.js";
import {
    getGuardians,
    getGuardianDetail,
    updateGuardian,
    linkParentToStudent,
    updateRelationship,
    unlinkParentFromStudent,
    getStudentParents,
    getSchoolStudentsForLinking
} from "./parent.controller.js";

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        parent: {
            create: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            update: vi.fn(),
            count: vi.fn()
        },
        parentStudent: {
            upsert: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
            delete: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            count: vi.fn()
        },
        studentEnrollment: {
            findFirst: vi.fn(),
            findMany: vi.fn()
        },
        student: {
            findUnique: vi.fn()
        },
        schoolGrade: {
            findMany: vi.fn()
        },
        section: {
            findMany: vi.fn()
        }
    }
}));

describe("ParentAdminService — Step 11 Parent/Guardian Management", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getGuardians (Tenant Scoping & Search)", () => {
        it("strictly scopes guardians to organization via student enrollments", async () => {
            const orgId = "org_school_1";

            vi.mocked(prisma.parent.count).mockResolvedValue(1);
            vi.mocked(prisma.parent.findMany).mockResolvedValue([
                {
                    id: "parent_1",
                    firstName: "Hana",
                    lastName: "Tesfaye",
                    phoneNumber: "+251911223344",
                    email: "hana@example.com",
                    createdAt: new Date("2026-09-01T10:00:00Z"),
                    children: [
                        {
                            id: "link_1",
                            studentId: "stu_1",
                            relationship: "Mother",
                            isPrimary: true,
                            canPickup: true,
                            student: {
                                id: "stu_1",
                                studentId: "STU-001",
                                firstName: "Abebe",
                                lastName: "Tesfaye",
                                enrollments: [
                                    {
                                        schoolGrade: { grade: { name: "Grade 8" } },
                                        section: { name: "B" }
                                    }
                                ]
                            }
                        }
                    ],
                    user: null
                }
            ] as any);

            const result = await ParentService.getGuardians(orgId, {
                search: "Hana",
                page: 1,
                limit: 10
            });

            expect(prisma.parent.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        children: {
                            some: {
                                student: {
                                    enrollments: {
                                        some: { organizationId: orgId }
                                    }
                                }
                            }
                        }
                    }),
                    skip: 0,
                    take: 10
                })
            );

            expect(result.pagination.total).toBe(1);
            expect(result.pagination.page).toBe(1);
            expect(result.guardians).toHaveLength(1);

            const guardian = result.guardians[0]!;
            expect(guardian.fullName).toBe("Hana Tesfaye");
            expect(guardian.childrenCount).toBe(1);
            expect(guardian.children[0]!.studentName).toBe("Abebe Tesfaye");
            expect(guardian.children[0]!.grade).toBe("Grade 8");
            expect(guardian.children[0]!.section).toBe("B");
            expect(guardian.children[0]!.isPrimary).toBe(true);
            expect(guardian.children[0]!.canPickup).toBe(true);
        });
    });

    describe("getGuardianDetail", () => {
        it("returns full guardian dossier with linked siblings enrolled in the school", async () => {
            const orgId = "org_school_1";
            const parentId = "parent_1";

            vi.mocked(prisma.parent.findUnique).mockResolvedValue({
                id: parentId,
                firstName: "Hana",
                lastName: "Tesfaye",
                phoneNumber: "+251911223344",
                email: "hana@example.com",
                createdAt: new Date("2026-09-01T10:00:00Z"),
                children: [
                    {
                        id: "link_1",
                        studentId: "stu_1",
                        relationship: "Mother",
                        isPrimary: true,
                        canPickup: true,
                        student: {
                            id: "stu_1",
                            studentId: "STU-001",
                            firstName: "Abebe",
                            lastName: "Tesfaye",
                            enrollments: [
                                {
                                    schoolGrade: { grade: { name: "Grade 8" } },
                                    schoolGradeId: "sg_8",
                                    section: { name: "B" },
                                    sectionId: "sec_b",
                                    academicYear: { name: "2026/2027" }
                                }
                            ]
                        }
                    },
                    {
                        id: "link_2",
                        studentId: "stu_2",
                        relationship: "Mother",
                        isPrimary: true,
                        canPickup: true,
                        student: {
                            id: "stu_2",
                            studentId: "STU-002",
                            firstName: "Sara",
                            lastName: "Tesfaye",
                            enrollments: [
                                {
                                    schoolGrade: { grade: { name: "Grade 5" } },
                                    schoolGradeId: "sg_5",
                                    section: { name: "A" },
                                    sectionId: "sec_a",
                                    academicYear: { name: "2026/2027" }
                                }
                            ]
                        }
                    }
                ]
            } as any);

            const detail = await ParentService.getGuardianDetail(orgId, parentId);

            expect(detail.fullName).toBe("Hana Tesfaye");
            expect(detail.childrenCount).toBe(2);
            expect(detail.children[0]!.studentName).toBe("Abebe Tesfaye");
            expect(detail.children[0]!.grade).toBe("Grade 8");
            expect(detail.children[1]!.studentName).toBe("Sara Tesfaye");
            expect(detail.children[1]!.grade).toBe("Grade 5");
        });

        it("throws an error when guardian is not found", async () => {
            vi.mocked(prisma.parent.findUnique).mockResolvedValue(null);

            await expect(
                ParentService.getGuardianDetail("org_school_1", "invalid_id")
            ).rejects.toThrow("Parent/Guardian not found");
        });
    });

    describe("createGuardian & updateGuardian", () => {
        it("creates a guardian record with trimmed names", async () => {
            vi.mocked(prisma.parent.create).mockResolvedValue({
                id: "parent_new",
                firstName: "Alem",
                lastName: "Bekele",
                phoneNumber: "+251922334455",
                email: "alem@example.com",
                userId: null
            } as any);

            const created = await ParentService.createParent({
                firstName: " Alem ",
                lastName: " Bekele ",
                phoneNumber: " +251922334455 ",
                email: " alem@example.com "
            });

            expect(prisma.parent.create).toHaveBeenCalledWith({
                data: {
                    firstName: "Alem",
                    lastName: "Bekele",
                    phoneNumber: "+251922334455",
                    email: "alem@example.com",
                    userId: null
                }
            });
            expect(created.id).toBe("parent_new");
        });

        it("updates guardian contact information", async () => {
            const orgId = "org_school_1";
            const parentId = "parent_1";

            vi.mocked(prisma.parent.findUnique).mockResolvedValue({
                id: parentId,
                children: [{ id: "link_1" }]
            } as any);

            vi.mocked(prisma.parent.update).mockResolvedValue({
                id: parentId,
                firstName: "Hana",
                lastName: "Tesfaye Updated",
                phoneNumber: "+251911999999",
                email: "updated@example.com"
            } as any);

            const updated = await ParentService.updateGuardian(orgId, parentId, {
                lastName: "Tesfaye Updated",
                phoneNumber: "+251911999999",
                email: "updated@example.com"
            });

            expect(prisma.parent.update).toHaveBeenCalledWith({
                where: { id: parentId },
                data: expect.objectContaining({
                    lastName: "Tesfaye Updated",
                    phoneNumber: "+251911999999",
                    email: "updated@example.com"
                })
            });
            expect(updated.lastName).toBe("Tesfaye Updated");
        });

        it("rejects update if guardian has no connection to the organization", async () => {
            const orgId = "org_school_1";
            const parentId = "parent_foreign";

            vi.mocked(prisma.parent.findUnique).mockResolvedValue({
                id: parentId,
                children: [] // No children in org_school_1
            } as any);
            vi.mocked(prisma.parentStudent.count).mockResolvedValue(1); // Belongs to another school

            await expect(
                ParentService.updateGuardian(orgId, parentId, { firstName: "Test" })
            ).rejects.toThrow("Guardian does not belong to this school organization");
        });
    });

    describe("linkGuardianToStudent (Security & Primary Integrity)", () => {
        it("links guardian to student and maintains single primary guardian integrity", async () => {
            const orgId = "org_school_1";
            const studentId = "stu_1";
            const parentId = "parent_1";

            vi.mocked(prisma.studentEnrollment.findFirst).mockResolvedValue({
                id: "enr_1",
                studentId,
                organizationId: orgId
            } as any);

            vi.mocked(prisma.parent.findUnique).mockResolvedValue({
                id: parentId,
                firstName: "Hana",
                lastName: "Tesfaye"
            } as any);

            vi.mocked(prisma.parentStudent.upsert).mockResolvedValue({
                id: "link_1",
                parentId,
                studentId,
                relationship: "Mother",
                isPrimary: true,
                canPickup: true
            } as any);

            const result = await ParentService.linkParentToStudent(orgId, {
                parentId,
                studentId,
                relationship: "Mother",
                isPrimary: true,
                canPickup: true
            });

            // Must unset isPrimary for other guardians of this student
            expect(prisma.parentStudent.updateMany).toHaveBeenCalledWith({
                where: {
                    studentId,
                    parentId: { not: parentId }
                },
                data: { isPrimary: false }
            });

            expect(prisma.parentStudent.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        parentId_studentId: { parentId, studentId }
                    },
                    create: expect.objectContaining({
                        relationship: "Mother",
                        isPrimary: true,
                        canPickup: true
                    })
                })
            );
            expect(result.id).toBe("link_1");
        });

        it("rejects cross-tenant linking if student does not belong to organization", async () => {
            const orgId = "org_school_1";
            vi.mocked(prisma.studentEnrollment.findFirst).mockResolvedValue(null);

            await expect(
                ParentService.linkParentToStudent(orgId, {
                    parentId: "p1",
                    studentId: "stu_foreign",
                    relationship: "Father"
                })
            ).rejects.toThrow("Student not found in this school organization");
        });
    });

    describe("updateRelationship & unlinkGuardianFromStudent", () => {
        it("updates relationship attributes with primary flag integrity", async () => {
            const orgId = "org_school_1";
            const studentId = "stu_1";
            const parentId = "parent_2";

            vi.mocked(prisma.studentEnrollment.findFirst).mockResolvedValue({
                id: "enr_1",
                studentId,
                organizationId: orgId
            } as any);

            vi.mocked(prisma.parentStudent.findUnique).mockResolvedValue({
                id: "link_2",
                parentId,
                studentId,
                relationship: "Father",
                isPrimary: false,
                canPickup: true
            } as any);

            vi.mocked(prisma.parentStudent.update).mockResolvedValue({
                id: "link_2",
                relationship: "Father",
                isPrimary: true,
                canPickup: true
            } as any);

            await ParentService.updateRelationship(orgId, parentId, studentId, {
                isPrimary: true
            });

            expect(prisma.parentStudent.updateMany).toHaveBeenCalledWith({
                where: {
                    studentId,
                    parentId: { not: parentId }
                },
                data: { isPrimary: false }
            });

            expect(prisma.parentStudent.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        parentId_studentId: { parentId, studentId }
                    },
                    data: expect.objectContaining({ isPrimary: true })
                })
            );
        });

        it("safely unlinks student without deleting parent or sibling relationships", async () => {
            const orgId = "org_school_1";
            const studentId = "stu_1";
            const parentId = "parent_1";

            vi.mocked(prisma.studentEnrollment.findFirst).mockResolvedValue({
                id: "enr_1",
                studentId,
                organizationId: orgId
            } as any);

            vi.mocked(prisma.parentStudent.findUnique).mockResolvedValue({
                id: "link_1",
                parentId,
                studentId
            } as any);

            const res = await ParentService.unlinkGuardianFromStudent(orgId, parentId, studentId);

            expect(prisma.parentStudent.delete).toHaveBeenCalledWith({
                where: {
                    parentId_studentId: { parentId, studentId }
                }
            });
            expect(res.success).toBe(true);
        });

        it("rejects cross-tenant unlink if student does not belong to school", async () => {
            const orgId = "org_school_1";
            vi.mocked(prisma.studentEnrollment.findFirst).mockResolvedValue(null);

            await expect(
                ParentService.unlinkGuardianFromStudent(orgId, "p1", "stu_foreign")
            ).rejects.toThrow("Student not found in this school organization");
        });
    });

    describe("getStudentParents (Tenant Scoped Student Lookup)", () => {
        it("returns guardians for student within tenant scope", async () => {
            const orgId = "org_school_1";
            const studentId = "stu_1";

            vi.mocked(prisma.studentEnrollment.findFirst).mockResolvedValue({
                id: "enr_1",
                studentId,
                organizationId: orgId
            } as any);

            vi.mocked(prisma.parentStudent.findMany).mockResolvedValue([
                {
                    id: "link_1",
                    relationship: "Mother",
                    isPrimary: true,
                    parent: { firstName: "Hana", lastName: "Tesfaye", phoneNumber: "+251911223344" }
                }
            ] as any);

            const list = await ParentService.getStudentParents(orgId, studentId);

            expect(list).toHaveLength(1);
            expect(list[0]!.parent.firstName).toBe("Hana");
        });

        it("rejects student guardian lookup if student not in organization", async () => {
            const orgId = "org_school_1";
            vi.mocked(prisma.studentEnrollment.findFirst).mockResolvedValue(null);

            await expect(
                ParentService.getStudentParents(orgId, "stu_foreign")
            ).rejects.toThrow("Student not found in this school organization");
        });
    });

    describe("Controller Scope Enforcement", () => {
        it("rejects getGuardians with 403 when accessScope is missing", async () => {
            const req: any = { query: {} };
            const res: any = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };

            await getGuardians(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: "Missing school scope" });
        });
    });
});
