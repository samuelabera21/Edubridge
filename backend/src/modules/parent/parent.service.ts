import { prisma } from "../../infrastructure/prisma/client.js";

export class ParentService {
    /**
     * Create a new parent/guardian record
     */
    static async createParent(data: { firstName: string; lastName: string; phoneNumber?: string; email?: string; userId?: string }) {
        if (!data.firstName?.trim() || !data.lastName?.trim()) {
            throw new Error("First name and last name are required");
        }

        return prisma.parent.create({
            data: {
                firstName: data.firstName.trim(),
                lastName: data.lastName.trim(),
                phoneNumber: data.phoneNumber?.trim() || null,
                email: data.email?.trim() || null,
                userId: data.userId || null
            }
        });
    }

    /**
     * Get paginated and searchable guardians scoped strictly to an organization (Tenant Isolation)
     */
    static async getGuardians(organizationId: string, options: { search?: string; schoolGradeId?: string; sectionId?: string; page?: number; limit?: number } = {}) {
        // Graceful auto-sync: convert any unlinked student emergency contacts into Parent & ParentStudent records
        try {
            const unlinkedStudents = await prisma.student.findMany({
                where: {
                    emergencyContactName: { not: null },
                    enrollments: {
                        some: { organizationId }
                    },
                    parents: {
                        none: {}
                    }
                },
                take: 100
            });

            for (const s of unlinkedStudents) {
                if (!s.emergencyContactName?.trim()) continue;
                const rawName = s.emergencyContactName.trim();
                const parts = rawName.split(/\s+/);
                const fName = parts[0] || "Guardian";
                const lName = parts.slice(1).join(" ").trim() || fName;
                const phone = s.emergencyContactPhone?.trim() || null;

                let p = null;
                if (phone) {
                    p = await prisma.parent.findFirst({ where: { phoneNumber: phone } });
                }
                if (!p) {
                    p = await prisma.parent.create({
                        data: {
                            firstName: fName,
                            lastName: lName,
                            phoneNumber: phone
                        }
                    });
                }

                await prisma.parentStudent.upsert({
                    where: {
                        parentId_studentId: {
                            parentId: p.id,
                            studentId: s.id
                        }
                    },
                    update: {
                        relationship: s.emergencyContactRelation || "Guardian",
                        isPrimary: true,
                        canPickup: true
                    },
                    create: {
                        parentId: p.id,
                        studentId: s.id,
                        relationship: s.emergencyContactRelation || "Guardian",
                        isPrimary: true,
                        canPickup: true
                    }
                });
            }
        } catch (e) {
            // Non-blocking sync fallback
        }

        const page = Math.max(1, Number(options.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
        const skip = (page - 1) * limit;
        const search = options.search?.trim();
        const schoolGradeId = options.schoolGradeId?.trim();
        const sectionId = options.sectionId?.trim();

        const enrollmentFilter: any = { organizationId };
        if (schoolGradeId) enrollmentFilter.schoolGradeId = schoolGradeId;
        if (sectionId) enrollmentFilter.sectionId = sectionId;

        const schoolParentWhere: any = {
            children: {
                some: {
                    student: {
                        enrollments: {
                            some: enrollmentFilter
                        }
                    }
                }
            }
        };

        if (search) {
            schoolParentWhere.AND = [
                {
                    OR: [
                        { firstName: { contains: search, mode: "insensitive" } },
                        { lastName: { contains: search, mode: "insensitive" } },
                        { phoneNumber: { contains: search, mode: "insensitive" } },
                        { email: { contains: search, mode: "insensitive" } },
                        {
                            children: {
                                some: {
                                    student: {
                                        OR: [
                                            { firstName: { contains: search, mode: "insensitive" } },
                                            { lastName: { contains: search, mode: "insensitive" } },
                                            { studentId: { contains: search, mode: "insensitive" } }
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                }
            ];
        }

        const [total, parents] = await Promise.all([
            prisma.parent.count({ where: schoolParentWhere }),
            prisma.parent.findMany({
                where: schoolParentWhere,
                include: {
                    children: {
                        where: {
                            student: {
                                enrollments: {
                                    some: {
                                        organizationId
                                    }
                                }
                            }
                        },
                        include: {
                            student: {
                                include: {
                                    enrollments: {
                                        where: { organizationId },
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
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            })
        ]);

        const formattedGuardians = parents.map(p => {
            const linkedChildren = p.children.map(c => {
                const activeEnrollment = c.student?.enrollments?.[0];
                return {
                    id: c.id,
                    studentId: c.studentId,
                    studentCode: c.student?.studentId || "N/A",
                    studentName: c.student ? `${c.student.firstName} ${c.student.lastName}` : "Student",
                    grade: activeEnrollment?.schoolGrade?.grade?.name || "Unassigned",
                    gradeId: activeEnrollment?.schoolGradeId || activeEnrollment?.schoolGrade?.id || "",
                    section: activeEnrollment?.section?.name || "Unassigned",
                    sectionId: activeEnrollment?.sectionId || activeEnrollment?.section?.id || "",
                    relationship: c.relationship,
                    isPrimary: c.isPrimary,
                    canPickup: c.canPickup
                };
            });

            return {
                id: p.id,
                firstName: p.firstName,
                lastName: p.lastName,
                fullName: `${p.firstName} ${p.lastName}`,
                phoneNumber: p.phoneNumber || null,
                email: p.email || null,
                childrenCount: linkedChildren.length,
                children: linkedChildren,
                hasPrimaryRole: linkedChildren.some(c => c.isPrimary),
                canPickupAny: linkedChildren.some(c => c.canPickup),
                createdAt: p.createdAt.toISOString()
            };
        });

        return {
            guardians: formattedGuardians,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1
            }
        };
    }

    /**
     * Get single guardian detail with all linked children in the school
     */
    static async getGuardianDetail(organizationId: string, parentId: string) {
        const parent = await prisma.parent.findUnique({
            where: { id: parentId },
            include: {
                children: {
                    where: {
                        student: {
                            enrollments: {
                                some: {
                                    organizationId
                                }
                            }
                        }
                    },
                    include: {
                        student: {
                            include: {
                                enrollments: {
                                    where: { organizationId },
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
            }
        });

        if (!parent) {
            throw new Error("Parent/Guardian not found");
        }

        const linkedChildren = parent.children.map(c => {
            const activeEnrollment = c.student?.enrollments?.[0];
            return {
                relationshipId: c.id,
                studentId: c.studentId,
                studentCode: c.student?.studentId || "N/A",
                studentName: c.student ? `${c.student.firstName} ${c.student.lastName}` : "Student",
                grade: activeEnrollment?.schoolGrade?.grade?.name || "Unassigned",
                gradeId: activeEnrollment?.schoolGradeId,
                section: activeEnrollment?.section?.name || "Unassigned",
                sectionId: activeEnrollment?.sectionId,
                academicYear: activeEnrollment?.academicYear?.name || "N/A",
                relationship: c.relationship,
                isPrimary: c.isPrimary,
                canPickup: c.canPickup
            };
        });

        return {
            id: parent.id,
            firstName: parent.firstName,
            lastName: parent.lastName,
            fullName: `${parent.firstName} ${parent.lastName}`,
            phoneNumber: parent.phoneNumber || null,
            email: parent.email || null,
            childrenCount: linkedChildren.length,
            children: linkedChildren,
            createdAt: parent.createdAt.toISOString()
        };
    }

    /**
     * Update an existing parent/guardian record
     */
    static async updateGuardian(
        organizationId: string,
        parentId: string,
        data: { firstName?: string; lastName?: string; phoneNumber?: string; email?: string }
    ) {
        const parent = await prisma.parent.findUnique({
            where: { id: parentId },
            include: {
                children: {
                    where: {
                        student: {
                            enrollments: {
                                some: { organizationId }
                            }
                        }
                    }
                }
            }
        });

        if (!parent) {
            throw new Error("Parent/Guardian not found");
        }

        // If parent is linked to students, ensure at least one link is in this organization
        if (parent.children.length === 0) {
            // Check if parent has any children globally
            const anyChildrenCount = await prisma.parentStudent.count({ where: { parentId } });
            if (anyChildrenCount > 0) {
                throw new Error("Guardian does not belong to this school organization");
            }
        }

        return prisma.parent.update({
            where: { id: parentId },
            data: {
                ...(data.firstName !== undefined ? { firstName: data.firstName.trim() } : {}),
                ...(data.lastName !== undefined ? { lastName: data.lastName.trim() } : {}),
                ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber?.trim() || null } : {}),
                ...(data.email !== undefined ? { email: data.email?.trim() || null } : {})
            }
        });
    }

    /**
     * Link a parent/guardian to a student with tenant validation and primary guardian integrity
     */
    static async linkParentToStudent(
        organizationId: string,
        data: { parentId: string; studentId: string; relationship: string; isPrimary?: boolean; canPickup?: boolean }
    ) {
        if (!data.parentId || !data.studentId || !data.relationship?.trim()) {
            throw new Error("Parent ID, Student ID, and relationship are required");
        }

        // 1. Verify student belongs to this organization
        const enrollment = await prisma.studentEnrollment.findFirst({
            where: {
                studentId: data.studentId,
                organizationId
            }
        });

        if (!enrollment) {
            throw new Error("Student not found in this school organization");
        }

        // 2. Verify parent exists
        const parent = await prisma.parent.findUnique({ where: { id: data.parentId } });
        if (!parent) {
            throw new Error("Parent/Guardian record not found");
        }

        const isPrimary = data.isPrimary ?? false;
        const canPickup = data.canPickup ?? true;

        // 3. Maintain Primary Guardian Integrity: If setting as primary, unset other guardians for this student
        if (isPrimary) {
            await prisma.parentStudent.updateMany({
                where: {
                    studentId: data.studentId,
                    parentId: { not: data.parentId }
                },
                data: { isPrimary: false }
            });
        }

        // 4. Upsert relationship link
        return prisma.parentStudent.upsert({
            where: {
                parentId_studentId: {
                    parentId: data.parentId,
                    studentId: data.studentId
                }
            },
            update: {
                relationship: data.relationship.trim(),
                isPrimary,
                canPickup
            },
            create: {
                parentId: data.parentId,
                studentId: data.studentId,
                relationship: data.relationship.trim(),
                isPrimary,
                canPickup
            },
            include: {
                parent: true,
                student: true
            }
        });
    }

    /**
     * Update an existing relationship between parent and student
     */
    static async updateRelationship(
        organizationId: string,
        parentId: string,
        studentId: string,
        data: { relationship?: string; isPrimary?: boolean; canPickup?: boolean }
    ) {
        // 1. Verify student belongs to this organization
        const enrollment = await prisma.studentEnrollment.findFirst({
            where: {
                studentId,
                organizationId
            }
        });

        if (!enrollment) {
            throw new Error("Student not found in this school organization");
        }

        // 2. Verify relationship exists
        const existing = await prisma.parentStudent.findUnique({
            where: {
                parentId_studentId: {
                    parentId,
                    studentId
                }
            }
        });

        if (!existing) {
            throw new Error("Relationship link not found");
        }

        // 3. Primary guardian integrity
        if (data.isPrimary) {
            await prisma.parentStudent.updateMany({
                where: {
                    studentId,
                    parentId: { not: parentId }
                },
                data: { isPrimary: false }
            });
        }

        return prisma.parentStudent.update({
            where: {
                parentId_studentId: {
                    parentId,
                    studentId
                }
            },
            data: {
                ...(data.relationship !== undefined ? { relationship: data.relationship.trim() } : {}),
                ...(data.isPrimary !== undefined ? { isPrimary: data.isPrimary } : {}),
                ...(data.canPickup !== undefined ? { canPickup: data.canPickup } : {})
            },
            include: {
                parent: true,
                student: true
            }
        });
    }

    /**
     * Unlink a parent from a student (Tenant-scoped, preserves parent and sibling relationships)
     */
    static async unlinkParentFromStudent(organizationId: string, parentId: string, studentId: string) {
        // 1. Verify student belongs to this organization
        const enrollment = await prisma.studentEnrollment.findFirst({
            where: {
                studentId,
                organizationId
            }
        });

        if (!enrollment) {
            throw new Error("Student not found in this school organization");
        }

        // 2. Verify relationship link exists
        const existing = await prisma.parentStudent.findUnique({
            where: {
                parentId_studentId: {
                    parentId,
                    studentId
                }
            }
        });

        if (!existing) {
            throw new Error("Relationship link not found");
        }

        // 3. Delete only the relationship link
        await prisma.parentStudent.delete({
            where: {
                parentId_studentId: {
                    parentId,
                    studentId
                }
            }
        });

        return { success: true, message: "Relationship unlinked successfully" };
    }

    static async unlinkGuardianFromStudent(organizationId: string, parentId: string, studentId: string) {
        return this.unlinkParentFromStudent(organizationId, parentId, studentId);
    }

    /**
     * Get all guardians for a specific student (Tenant-scoped)
     */
    static async getStudentParents(organizationId: string, studentId: string) {
        // 1. Verify student belongs to this organization
        const enrollment = await prisma.studentEnrollment.findFirst({
            where: {
                studentId,
                organizationId
            }
        });

        if (!enrollment) {
            throw new Error("Student not found in this school organization");
        }

        return prisma.parentStudent.findMany({
            where: { studentId },
            include: {
                parent: true
            },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }]
        });
    }

    /**
     * Get school-scoped students list for linking dropdowns with search, grade, and section filters
     */
    static async getSchoolStudentsForLinking(
        organizationId: string,
        options: { search?: string; schoolGradeId?: string; sectionId?: string; limit?: number } = {}
    ) {
        const limit = Math.min(100, Math.max(1, Number(options.limit) || 30));
        const search = options.search?.trim();

        const whereClause: any = {
            organizationId,
            ...(options.schoolGradeId ? { schoolGradeId: options.schoolGradeId } : {}),
            ...(options.sectionId ? { sectionId: options.sectionId } : {})
        };

        if (search) {
            whereClause.student = {
                OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { studentId: { contains: search, mode: "insensitive" } }
                ]
            };
        }

        const enrollments = await prisma.studentEnrollment.findMany({
            where: whereClause,
            include: {
                student: true,
                schoolGrade: { include: { grade: true } },
                section: true
            },
            take: limit,
            orderBy: { createdAt: "desc" }
        });

        return enrollments.map(e => ({
            id: e.student.id,
            studentId: e.student.id,
            studentCode: e.student.studentId,
            fullName: `${e.student.firstName} ${e.student.lastName}`,
            firstName: e.student.firstName,
            lastName: e.student.lastName,
            gradeName: e.schoolGrade?.grade?.name || "N/A",
            gradeId: e.schoolGradeId,
            sectionName: e.section?.name || "N/A",
            sectionId: e.sectionId
        }));
    }

    /**
     * Get filter options (grades and sections) for the school
     */
    static async getFilterOptions(organizationId: string) {
        const schoolGrades = await prisma.schoolGrade.findMany({
            where: {
                academicYear: { organizationId }
            },
            include: {
                grade: true,
                sections: {
                    select: { id: true, name: true, schoolGradeId: true }
                }
            },
            orderBy: { grade: { level: "asc" } }
        });

        const sectionsList: Array<{ id: string; name: string; schoolGradeId: string; gradeName: string }> = [];
        const gradesList = schoolGrades.map(sg => {
            const gradeName = sg.grade?.name || "Grade";
            if (sg.sections && sg.sections.length > 0) {
                sg.sections.forEach(sec => {
                    sectionsList.push({
                        id: sec.id,
                        name: sec.name,
                        schoolGradeId: sg.id,
                        gradeName
                    });
                });
            }
            return {
                id: sg.id,
                name: gradeName,
                level: sg.grade?.level || 0
            };
        });

        return {
            grades: gradesList,
            sections: sectionsList
        };
    }

    /**
     * Get parent self-service profile by userId (Parent Portal)
     */
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

    /**
     * Legacy scoped wrapper for getParents
     */
    static async getParents(organizationId?: string) {
        if (organizationId) {
            const result = await this.getGuardians(organizationId, { limit: 100 });
            return result.guardians;
        }

        return [];
    }

    // Domain 10: Meetings (Unchanged for compatibility)
    static async getMeetings(organizationId: string) {
        return prisma.parentMeeting.findMany({
            where: { organizationId },
            orderBy: { scheduledDate: "desc" }
        });
    }

    static async createMeeting(organizationId: string, data: any) {
        return prisma.parentMeeting.create({
            data: {
                organizationId,
                title: data.title,
                meetingType: data.meetingType || "PTA_GENERAL",
                scheduledDate: new Date(data.scheduledDate || Date.now()),
                location: data.location || "Main Assembly Hall",
                agenda: data.agenda,
                status: "SCHEDULED"
            }
        });
    }

    // Domain 10: Notifications (Unchanged for compatibility)
    static async getNotifications(organizationId: string) {
        return prisma.parentNotification.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createNotification(organizationId: string, data: any) {
        return prisma.parentNotification.create({
            data: {
                organizationId,
                parentId: data.parentId || null,
                title: data.title,
                message: data.message,
                channel: data.channel || "PORTAL",
                status: "SENT"
            }
        });
    }

    // Domain 10: Participation (Unchanged for compatibility)
    static async getParticipations(organizationId: string) {
        return prisma.parentParticipation.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createParticipation(organizationId: string, data: any) {
        return prisma.parentParticipation.create({
            data: {
                organizationId,
                parentName: data.parentName,
                activityTitle: data.activityTitle,
                category: data.category || "VOLUNTEER",
                hoursLogged: Number(data.hoursLogged) || 0,
                eventDate: data.eventDate ? new Date(data.eventDate) : new Date()
            }
        });
    }
}
