import { prisma } from "../../infrastructure/prisma/client.js";
import { EnrollmentStatus, EnrollmentType, DocumentVerificationStatus, AnnouncementTarget } from "../../generated/prisma/enums.js";
import { emitNewMessageToUsers, getIO } from "../../infrastructure/socket/socket.service.js";
import { auth } from "../authentication/auth.js";
import { assignRoleToUserByScopeId } from "../authentication/authorization.service.js";

export interface GuardianInput {
    id?: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    email?: string;
    relationship: string;
    isPrimary?: boolean;
    canPickup?: boolean;
}

export interface DocumentInput {
    id?: string;
    documentType: string;
    title: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    verificationStatus?: DocumentVerificationStatus;
    verificationNotes?: string;
}

export interface StudentIntakePayload {
    isExistingStudent?: boolean;
    existingStudentId?: string; // Student.id or Student.studentId
    student: {
        id?: string;
        firstName: string;
        fatherName: string;
        grandfatherName: string;
        studentId?: string;
        dateOfBirth?: string | Date | null;
        gender?: string;
        nationality?: string;
        placeOfBirth?: string;
        photoUrl?: string | null;
        region?: string;
        zone?: string;
        woreda?: string;
        city?: string;
        kebele?: string;
        houseNumber?: string;
        previousSchool?: string;
        previousStudentId?: string;
        emergencyContactName?: string;
        emergencyContactRelation?: string;
        emergencyContactPhone?: string;
        documents?: any;
    };
    guardians?: GuardianInput[];
    enrollment: {
        academicYearId: string;
        schoolGradeId: string;
        enrollmentType?: EnrollmentType;
        enrollmentDate?: string | Date;
    };
    documents?: DocumentInput[];
}

export class StudentService {
    /**
     * Deterministic & collision-resistant Student ID generator (e.g. STU-YYMM-XXXX)
     */
    static async generateStudentId(): Promise<string> {
        const dateStr = new Date().toISOString().slice(2, 7).replace("-", ""); // YYMM e.g. 2609
        for (let attempt = 0; attempt < 10; attempt++) {
            const randomCode = Math.floor(1000 + Math.random() * 9000);
            const candidate = `STU-${dateStr}-${randomCode}`;
            const existing = await prisma.student.findUnique({ where: { studentId: candidate } });
            if (!existing) return candidate;
        }
        return `STU-${dateStr}-${Date.now().toString().slice(-4)}`;
    }

    /**
     * Atomic Step 4 Student Intake & Academic-Year Enrollment Transaction
     */
    static async registerStudentIntake(organizationId: string, payload: StudentIntakePayload, operatorUserId?: string) {
        const { student: studentData, enrollment: enrollmentData, guardians = [], documents = [], isExistingStudent, existingStudentId } = payload;

        if (!enrollmentData?.academicYearId || !enrollmentData?.schoolGradeId) {
            throw new Error("Academic Year and School Grade are required for enrollment");
        }

        // 1. Validate Academic Year (Step 1 Boundary Guard)
        const academicYear = await prisma.academicYear.findFirst({
            where: {
                id: enrollmentData.academicYearId,
                organizationId
            }
        });

        if (!academicYear) {
            throw new Error("Academic year not found or does not belong to this school organization");
        }

        if (academicYear.status === "ARCHIVED" || academicYear.status === "COMPLETED") {
            throw new Error(`Cannot register or enroll students in an ${academicYear.status.toLowerCase()} academic year`);
        }

        // 2. Validate School Grade (Step 2 Boundary Guard)
        const schoolGrade = await prisma.schoolGrade.findFirst({
            where: {
                id: enrollmentData.schoolGradeId,
                academicYearId: enrollmentData.academicYearId,
                academicYear: {
                    organizationId
                }
            },
            include: { grade: true }
        });

        if (!schoolGrade) {
            throw new Error("Target school grade not found or does not belong to this school organization");
        }

        // 3. Resolve Target Student Identity
        let targetStudent: any = null;

        if (isExistingStudent || existingStudentId || studentData?.id || studentData?.studentId) {
            const lookupId = existingStudentId || studentData?.id;
            const lookupCode = studentData?.studentId;

            targetStudent = await prisma.student.findFirst({
                where: {
                    OR: [
                        ...(lookupId ? [{ id: lookupId }, { studentId: lookupId }] : []),
                        ...(lookupCode ? [{ studentId: lookupCode }] : [])
                    ]
                }
            });

            if (!targetStudent && isExistingStudent) {
                throw new Error("Specified existing student identity was not found in the system");
            }
        }

        // 4. Validate Duplicate Active Enrollment in Same Academic Year
        if (targetStudent) {
            const existingActiveEnrollment = await prisma.studentEnrollment.findFirst({
                where: {
                    studentId: targetStudent.id,
                    academicYearId: enrollmentData.academicYearId,
                    organizationId,
                    status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.ENROLLED] }
                }
            });

            if (existingActiveEnrollment) {
                throw new Error("Student is already actively enrolled in this school for the selected academic year");
            }
        }

        // If new student, validate required Ethiopian naming structure
        if (!targetStudent) {
            if (!studentData.firstName?.trim() || !studentData.fatherName?.trim() || !studentData.grandfatherName?.trim()) {
                throw new Error("First Name, Father's Name, and Grandfather's Name are required for new student identity");
            }

            // Generate studentId if not supplied
            if (!studentData.studentId) {
                studentData.studentId = await this.generateStudentId();
            } else {
                const idConflict = await prisma.student.findUnique({ where: { studentId: studentData.studentId } });
                if (idConflict) {
                    throw new Error(`Student ID '${studentData.studentId}' is already assigned to another student`);
                }
            }
        }

        // 5. Execute Atomic Intake Transaction
        const transactionResult = await prisma.$transaction(async (tx) => {
            let studentRecord = targetStudent;

            const lastName = `${studentData.fatherName || ""} ${studentData.grandfatherName || ""}`.trim() || studentData.fatherName || "N/A";

            if (!studentRecord) {
                studentRecord = await tx.student.create({
                    data: {
                        studentId: studentData.studentId!,
                        firstName: studentData.firstName.trim(),
                        lastName,
                        fatherName: studentData.fatherName?.trim() || null,
                        grandfatherName: studentData.grandfatherName?.trim() || null,
                        dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : null,
                        gender: studentData.gender || null,
                        nationality: studentData.nationality || "Ethiopian",
                        placeOfBirth: studentData.placeOfBirth || null,
                        photoUrl: studentData.photoUrl || null,
                        region: studentData.region || null,
                        zone: studentData.zone || null,
                        woreda: studentData.woreda || null,
                        city: studentData.city || null,
                        kebele: studentData.kebele || null,
                        houseNumber: studentData.houseNumber || null,
                        previousSchool: studentData.previousSchool || null,
                        previousStudentId: studentData.previousStudentId || null,
                        emergencyContactName: studentData.emergencyContactName || null,
                        emergencyContactRelation: studentData.emergencyContactRelation || null,
                        emergencyContactPhone: studentData.emergencyContactPhone || null,
                        documents: studentData.documents || null
                    }
                });
            } else {
                // Update optional demographic / contact changes on existing student
                studentRecord = await tx.student.update({
                    where: { id: studentRecord.id },
                    data: {
                        dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : studentRecord.dateOfBirth,
                        gender: studentData.gender || studentRecord.gender,
                        nationality: studentData.nationality || studentRecord.nationality,
                        photoUrl: studentData.photoUrl !== undefined ? studentData.photoUrl : studentRecord.photoUrl,
                        region: studentData.region || studentRecord.region,
                        zone: studentData.zone || studentRecord.zone,
                        woreda: studentData.woreda || studentRecord.woreda,
                        city: studentData.city || studentRecord.city,
                        kebele: studentData.kebele || studentRecord.kebele,
                        houseNumber: studentData.houseNumber || studentRecord.houseNumber,
                        emergencyContactName: studentData.emergencyContactName || studentRecord.emergencyContactName,
                        emergencyContactRelation: studentData.emergencyContactRelation || studentRecord.emergencyContactRelation,
                        emergencyContactPhone: studentData.emergencyContactPhone || studentRecord.emergencyContactPhone,
                    }
                });
            }

            // 6. Persist Guardians & Link to Student
            const createdGuardians = [];
            const incomingGuardians: any[] = [...(guardians || [])];
            if (incomingGuardians.length === 0 && (studentData.emergencyContactName?.trim())) {
                incomingGuardians.push({
                    fullName: studentData.emergencyContactName.trim(),
                    phoneNumber: studentData.emergencyContactPhone?.trim() || null,
                    relationship: studentData.emergencyContactRelation?.trim() || "Guardian",
                    isPrimary: true,
                    canPickup: true
                });
            }

            for (const g of incomingGuardians) {
                const rawFullName = g.fullName || g.name || `${g.firstName || ""} ${g.lastName || ""}`.trim();
                if (!rawFullName && !g.firstName?.trim()) continue;

                const nameParts = rawFullName ? rawFullName.trim().split(/\s+/) : [];
                const firstName = g.firstName?.trim() || nameParts[0] || "Guardian";
                const lastName = g.lastName?.trim() || nameParts.slice(1).join(" ").trim() || firstName;
                const phone = g.phoneNumber?.trim() || g.phone?.trim() || null;
                const email = g.email?.trim() || null;

                let parent = null;
                if (g.id) {
                    parent = await tx.parent.findUnique({ where: { id: g.id } });
                } else if (phone) {
                    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, "");
                    const last9 = cleanPhone.length >= 9 ? cleanPhone.slice(-9) : cleanPhone;
                    const orConditions: any[] = [
                        { phoneNumber: phone },
                        { phoneNumber: cleanPhone }
                    ];
                    if (last9) {
                        orConditions.push({ phoneNumber: { endsWith: last9 } });
                    }
                    if (email) {
                        orConditions.push({ email: { equals: email, mode: "insensitive" } });
                    }
                    parent = await tx.parent.findFirst({
                        where: { OR: orConditions }
                    });
                } else if (email) {
                    parent = await tx.parent.findFirst({
                        where: { email: { equals: email, mode: "insensitive" } }
                    });
                }

                if (!parent) {
                    parent = await tx.parent.create({
                        data: {
                            firstName,
                            lastName,
                            phoneNumber: phone,
                            email
                        }
                    });
                }

                const link = await tx.parentStudent.upsert({
                    where: {
                        parentId_studentId: {
                            parentId: parent.id,
                            studentId: studentRecord.id
                        }
                    },
                    update: {
                        relationship: g.relationship || "Guardian",
                        isPrimary: g.isPrimary ?? true,
                        canPickup: g.canPickup ?? true
                    },
                    create: {
                        parentId: parent.id,
                        studentId: studentRecord.id,
                        relationship: g.relationship || "Guardian",
                        isPrimary: g.isPrimary ?? true,
                        canPickup: g.canPickup ?? true
                    }
                });

                createdGuardians.push({ parent, link });
            }

            // 7. Create Student Enrollment (Explicit Step 4 Boundary: sectionId = null)
            const enrollmentType = enrollmentData.enrollmentType || (
                isExistingStudent || targetStudent ? EnrollmentType.RETURNING : EnrollmentType.NEW
            );

            const enrollment = await tx.studentEnrollment.create({
                data: {
                    studentId: studentRecord.id,
                    organizationId,
                    academicYearId: enrollmentData.academicYearId,
                    schoolGradeId: enrollmentData.schoolGradeId,
                    sectionId: null, // Strictly unplaced for Step 4
                    enrollmentType,
                    status: EnrollmentStatus.ENROLLED,
                    enrollmentDate: enrollmentData.enrollmentDate ? new Date(enrollmentData.enrollmentDate) : new Date()
                }
            });

            // 8. Record Status History
            await tx.studentStatusHistory.create({
                data: {
                    enrollmentId: enrollment.id,
                    status: EnrollmentStatus.ENROLLED,
                    reason: isExistingStudent ? "Returning Student Re-Enrollment (Step 4)" : "New Student Intake (Step 4)"
                }
            });

            // 9. Persist Structured Supporting Evidence Documents
            const savedDocuments = [];
            for (const doc of documents) {
                if (!doc.fileUrl || !doc.title) continue;
                const savedDoc = await tx.studentDocument.create({
                    data: {
                        studentId: studentRecord.id,
                        enrollmentId: enrollment.id,
                        documentType: doc.documentType || "OTHER",
                        title: doc.title,
                        fileUrl: doc.fileUrl,
                        fileSize: doc.fileSize || null,
                        mimeType: doc.mimeType || null,
                        verificationStatus: doc.verificationStatus || DocumentVerificationStatus.PENDING,
                        verificationNotes: doc.verificationNotes || null,
                    }
                });
                savedDocuments.push(savedDoc);
            }

            // 10. Record Audit Log
            await tx.auditLog.create({
                data: {
                    organizationId,
                    userId: operatorUserId || null,
                    action: isExistingStudent ? "STUDENT_RE_ENROLLED" : "STUDENT_REGISTERED",
                    resource: "StudentEnrollment",
                    resourceId: enrollment.id,
                    newValue: {
                        studentId: studentRecord.id,
                        studentCode: studentRecord.studentId,
                        academicYearId: enrollment.academicYearId,
                        schoolGradeId: enrollment.schoolGradeId,
                        enrollmentType,
                        documentsCount: savedDocuments.length,
                        guardiansCount: createdGuardians.length
                    }
                }
            });

            return {
                student: studentRecord,
                enrollment: {
                    ...enrollment,
                    schoolGrade,
                    academicYear
                },
                guardians: createdGuardians,
                documents: savedDocuments
            };
        });

        // 6. Auto-provision or link User Login Accounts for Guardians (No manual admin work needed)
        const parentCredentials: Array<{
            parentId: string;
            parentName: string;
            relationship: string;
            loginId: string;
            email: string;
            initialPassword: string;
            isNewAccount: boolean;
        }> = [];

        for (const g of transactionResult.guardians || []) {
            if (g.parent) {
                const creds = await StudentService.autoProvisionParentAccount(g.parent, organizationId);
                if (creds) {
                    parentCredentials.push({
                        ...creds,
                        relationship: g.link?.relationship || "Guardian"
                    });
                }
            }
        }

        return {
            ...transactionResult,
            parentCredentials
        };
    }

    /**
     * Auto-provisions or links a User login account for a Parent upon student enrollment.
     * Prevents duplicate accounts when the parent already has other children in the school.
     */
    static async autoProvisionParentAccount(parent: {
        id: string;
        firstName: string;
        lastName: string;
        phoneNumber?: string | null;
        email?: string | null;
        userId?: string | null;
    }, organizationId: string): Promise<{
        parentId: string;
        parentName: string;
        loginId: string;
        email: string;
        initialPassword: string;
        isNewAccount: boolean;
    } | null> {
        try {
            const fullName = `${parent.firstName} ${parent.lastName}`.trim() || "Parent";
            const cleanPhone = (parent.phoneNumber || "").replace(/[\s\-\(\)\+]/g, "");

            // 1. If parent entity already has a linked userId (e.g. existing parent registering another child)
            if (parent.userId) {
                const existingUser = await prisma.user.findUnique({ where: { id: parent.userId } });
                if (existingUser) {
                    await assignRoleToUserByScopeId(existingUser.id, "PARENT", organizationId);
                    return {
                        parentId: parent.id,
                        parentName: fullName,
                        loginId: parent.phoneNumber || existingUser.email,
                        email: existingUser.email,
                        initialPassword: "(Existing Account)",
                        isNewAccount: false
                    };
                }
            }

            // 2. Determine target login email
            let targetEmail = parent.email?.toLowerCase().trim();
            if (!targetEmail) {
                if (cleanPhone) {
                    targetEmail = `${cleanPhone}@edubridge.local`;
                } else {
                    targetEmail = `parent.${parent.id.slice(-6)}@edubridge.local`;
                }
            }

            const tempPassword = process.env.DEFAULT_INITIAL_PASSWORD || "EduBridge2026!";

            // 3. Check if User already exists with this email or phone
            const userOrConditions: any[] = [
                { email: { equals: targetEmail, mode: "insensitive" } }
            ];
            if (cleanPhone) {
                userOrConditions.push({ email: { startsWith: cleanPhone, mode: "insensitive" } });
            }

            let user = await prisma.user.findFirst({
                where: { OR: userOrConditions }
            });

            let isNew = false;
            if (!user) {
                const newUserRes = await auth.api.signUpEmail({
                    body: {
                        email: targetEmail,
                        password: tempPassword,
                        name: fullName
                    }
                });
                if (newUserRes?.user) {
                    user = newUserRes.user as any;
                    isNew = true;
                    if (user?.id) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                requiresPasswordChange: true,
                                isActive: true
                            }
                        });
                    }
                }
            }

            if (user) {
                // Link Parent entity to User
                await prisma.parent.update({
                    where: { id: parent.id },
                    data: { userId: user.id }
                });

                // Assign PARENT role scoped to this school
                await assignRoleToUserByScopeId(user.id, "PARENT", organizationId);

                return {
                    parentId: parent.id,
                    parentName: fullName,
                    loginId: parent.phoneNumber || user.email,
                    email: user.email,
                    initialPassword: isNew ? tempPassword : "(Existing Account)",
                    isNewAccount: isNew
                };
            }
        } catch (err) {
            console.error("[Auto-Provision Parent Error]:", err);
        }
        return null;
    }

    /**
     * Search existing students for duplicate check & returning student workflow
     */
    static async searchExistingStudents(query: { search?: string; studentId?: string; firstName?: string; fatherName?: string; dateOfBirth?: string }) {
        const whereClause: any = {};

        if (query.studentId) {
            whereClause.studentId = { contains: query.studentId.trim(), mode: "insensitive" };
        } else if (query.search) {
            const term = query.search.trim();
            whereClause.OR = [
                { studentId: { contains: term, mode: "insensitive" } },
                { firstName: { contains: term, mode: "insensitive" } },
                { fatherName: { contains: term, mode: "insensitive" } },
                { grandfatherName: { contains: term, mode: "insensitive" } },
                { lastName: { contains: term, mode: "insensitive" } }
            ];
        } else {
            const conditions: any[] = [];
            if (query.firstName?.trim()) {
                conditions.push({ firstName: { contains: query.firstName.trim(), mode: "insensitive" } });
            }
            if (query.fatherName?.trim()) {
                conditions.push({ fatherName: { contains: query.fatherName.trim(), mode: "insensitive" } });
            }
            if (conditions.length > 0) {
                whereClause.AND = conditions;
            }
        }

        return prisma.student.findMany({
            where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
            take: 25,
            select: {
                id: true,
                studentId: true,
                firstName: true,
                fatherName: true,
                grandfatherName: true,
                lastName: true,
                gender: true,
                dateOfBirth: true,
                placeOfBirth: true,
                photoUrl: true,
                city: true,
                region: true,
                woreda: true,
                kebele: true,
                previousSchool: true,
                enrollments: {
                    take: 3,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        status: true,
                        enrollmentType: true,
                        academicYear: { select: { id: true, name: true, status: true } },
                        schoolGrade: { select: { id: true, grade: { select: { name: true } } } },
                        section: { select: { id: true, name: true } },
                        organization: { select: { id: true, name: true } }
                    }
                },
                parents: {
                    select: {
                        relationship: true,
                        isPrimary: true,
                        parent: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                phoneNumber: true,
                                email: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });
    }

    /**
     * Get school-scoped students list (Tenant Isolation) with optional pagination
     */
    static async getSchoolStudents(organizationId: string, options?: {
        search?: string;
        gender?: string;
        schoolGradeId?: string;
        status?: EnrollmentStatus;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }) {
        const whereClause: any = {
            enrollments: {
                some: {
                    organizationId,
                    ...(options?.schoolGradeId && options.schoolGradeId !== "ALL" ? { schoolGradeId: options.schoolGradeId } : {}),
                    ...(options?.status && (options.status as string) !== "ALL" ? { status: options.status } : {})
                }
            },
            ...(options?.gender && options.gender !== "ALL" ? {
                gender: { equals: options.gender, mode: "insensitive" }
            } : {})
        };

        if (options?.search && options.search.trim()) {
            const term = options.search.trim();
            const words = term.split(/\s+/).filter(Boolean);
            if (words.length > 1) {
                whereClause.AND = words.map(w => ({
                    OR: [
                        { studentId: { contains: w, mode: "insensitive" } },
                        { firstName: { contains: w, mode: "insensitive" } },
                        { fatherName: { contains: w, mode: "insensitive" } },
                        { grandfatherName: { contains: w, mode: "insensitive" } },
                        { lastName: { contains: w, mode: "insensitive" } },
                        { previousStudentId: { contains: w, mode: "insensitive" } }
                    ]
                }));
            } else {
                whereClause.OR = [
                    { studentId: { contains: term, mode: "insensitive" } },
                    { firstName: { contains: term, mode: "insensitive" } },
                    { fatherName: { contains: term, mode: "insensitive" } },
                    { grandfatherName: { contains: term, mode: "insensitive" } },
                    { lastName: { contains: term, mode: "insensitive" } },
                    { previousStudentId: { contains: term, mode: "insensitive" } }
                ];
            }
        }

        const isPaginated = options?.page !== undefined || options?.limit !== undefined;
        const page = Math.max(1, Number(options?.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(options?.limit) || 20));
        const skip = (page - 1) * limit;

        const sortField = options?.sortBy || "createdAt";
        const sortOrder = options?.sortOrder || "desc";

        if (isPaginated) {
            const [total, students] = await Promise.all([
                prisma.student.count({ where: whereClause }),
                prisma.student.findMany({
                    where: whereClause,
                    include: {
                        enrollments: {
                            where: { organizationId },
                            include: {
                                academicYear: true,
                                schoolGrade: { include: { grade: true } },
                                section: true
                            },
                            orderBy: { createdAt: "desc" }
                        },
                        parents: {
                            include: { parent: true }
                        },
                        studentDocuments: true
                    },
                    skip,
                    take: limit,
                    orderBy: { [sortField]: sortOrder }
                })
            ]);

            return {
                data: students,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };
        }

        return prisma.student.findMany({
            where: whereClause,
            include: {
                enrollments: {
                    where: { organizationId },
                    include: {
                        academicYear: true,
                        schoolGrade: { include: { grade: true } },
                        section: true
                    },
                    orderBy: { createdAt: "desc" }
                },
                parents: {
                    include: { parent: true }
                },
                studentDocuments: true
            },
            orderBy: { [sortField]: sortOrder }
        });
    }

    /**
     * Verify or reject student evidence document
     */
    static async verifyDocument(
        organizationId: string,
        documentId: string,
        verificationStatus: DocumentVerificationStatus,
        notes?: string,
        verifierUserId?: string
    ) {
        const doc = await prisma.studentDocument.findUnique({
            where: { id: documentId },
            include: {
                student: {
                    include: {
                        enrollments: {
                            where: { organizationId }
                        }
                    }
                }
            }
        });

        if (!doc || doc.student.enrollments.length === 0) {
            throw new Error("Document not found or student does not belong to this school organization");
        }

        const updated = await prisma.studentDocument.update({
            where: { id: documentId },
            data: {
                verificationStatus,
                verificationNotes: notes || null,
                verifiedAt: new Date(),
                verifiedById: verifierUserId || null
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                userId: verifierUserId || null,
                action: "DOCUMENT_VERIFIED",
                resource: "StudentDocument",
                resourceId: documentId,
                newValue: { verificationStatus, notes }
            }
        });

        return updated;
    }

    static async createStudent(data: any) {
        const student = await prisma.student.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                userId: data.studentUserId || null,
                fatherName: data.fatherName,
                grandfatherName: data.grandfatherName,
                studentId: data.studentId,
                dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
                gender: data.gender,
                nationality: data.nationality,
                placeOfBirth: data.placeOfBirth,
                photoUrl: data.photoUrl,
                region: data.region,
                zone: data.zone,
                woreda: data.woreda,
                city: data.city,
                kebele: data.kebele,
                houseNumber: data.houseNumber,
                previousSchool: data.previousSchool,
                previousStudentId: data.previousStudentId,
                emergencyContactName: data.emergencyContactName,
                emergencyContactRelation: data.emergencyContactRelation,
                emergencyContactPhone: data.emergencyContactPhone,
                documents: data.documents || null
            }
        });

        await prisma.auditLog.create({
            data: {
                action: "STUDENT_CREATED",
                resource: "Student",
                resourceId: student.id,
                newValue: JSON.parse(JSON.stringify(student)),
                userId: data.userId || null
            }
        });

        return student;
    }

    static async getStudents(options: {
        organizationId?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        search?: string;
        gender?: string;
        status?: string;
        schoolGradeId?: string;
        sectionId?: string;
        academicYearId?: string;
        city?: string;
    } = {}) {
        const {
            page = 1,
            limit = 25,
            sortBy = "createdAt",
            sortOrder = "desc",
            search,
            gender,
            status,
            schoolGradeId,
            sectionId,
            academicYearId,
            city
        } = options;

        const where: any = {};

        if (gender && gender !== "ALL") {
            where.gender = { equals: gender, mode: "insensitive" };
        }

        if (city && city !== "ALL") {
            where.city = { contains: city, mode: "insensitive" };
        }

        const enrollmentCondition: any = {};
        if (status && status !== "ALL") {
            enrollmentCondition.status = status as any;
        }
        if (schoolGradeId && schoolGradeId !== "ALL") {
            enrollmentCondition.schoolGradeId = schoolGradeId;
        }
        if (sectionId && sectionId !== "ALL") {
            enrollmentCondition.sectionId = sectionId;
        }
        if (academicYearId && academicYearId !== "ALL") {
            enrollmentCondition.academicYearId = academicYearId;
        }

        if (Object.keys(enrollmentCondition).length > 0) {
            where.enrollments = {
                some: enrollmentCondition
            };
        }

        if (search && search.trim()) {
            const terms = search.trim().split(/\s+/).filter(Boolean);
            const buildTermCondition = (term: string) => ({
                OR: [
                    { studentId: { contains: term, mode: "insensitive" } },
                    { firstName: { contains: term, mode: "insensitive" } },
                    { fatherName: { contains: term, mode: "insensitive" } },
                    { grandfatherName: { contains: term, mode: "insensitive" } },
                    { lastName: { contains: term, mode: "insensitive" } },
                    { city: { contains: term, mode: "insensitive" } },
                    { region: { contains: term, mode: "insensitive" } },
                    { emergencyContactName: { contains: term, mode: "insensitive" } },
                    {
                        parents: {
                            some: {
                                parent: {
                                    OR: [
                                        { firstName: { contains: term, mode: "insensitive" } },
                                        { lastName: { contains: term, mode: "insensitive" } }
                                    ]
                                }
                            }
                        }
                    }
                ]
            });

            const firstTerm = terms[0];
            if (terms.length === 1 && firstTerm) {
                where.OR = buildTermCondition(firstTerm).OR;
            } else if (terms.length > 1) {
                where.AND = terms.map(buildTermCondition);
            }
        }

        let orderBy: any = { createdAt: sortOrder || "desc" };
        if (sortBy === "firstName") {
            orderBy = { firstName: sortOrder || "asc" };
        } else if (sortBy === "studentId") {
            orderBy = { studentId: sortOrder || "asc" };
        } else if (sortBy === "createdAt") {
            orderBy = { createdAt: sortOrder || "desc" };
        }

        const isExport = limit <= 0;
        const pageNum = Math.max(1, page);
        const take = isExport ? undefined : limit;
        const skip = isExport ? undefined : (pageNum - 1) * limit;

        const [total, students] = await Promise.all([
            prisma.student.count({ where }),
            prisma.student.findMany({
                where,
                orderBy,
                skip,
                take,
                include: {
                    enrollments: {
                        include: {
                            academicYear: true,
                            schoolGrade: {
                                include: { grade: true }
                            },
                            section: true
                        },
                        orderBy: { createdAt: "desc" }
                    },
                    parents: {
                        include: {
                            parent: {
                                include: {
                                    user: true
                                }
                            }
                        }
                    }
                }
            })
        ]);

        const formatted = students.map((s: any) => ({
            ...s,
            guardians: (s.parents || []).map((p: any) => ({
                id: p.id,
                relationship: p.relationship,
                isPrimary: p.isPrimary,
                canPickup: p.canPickup,
                parent: p.parent,
                fullName: p.parent ? `${p.parent.firstName || ""} ${p.parent.lastName || ""}`.trim() : undefined,
                phoneNumber: p.parent?.phoneNumber
            }))
        }));

        const totalPages = isExport ? 1 : Math.max(1, Math.ceil(total / (limit || 1)));

        return {
            data: formatted,
            meta: {
                total,
                page: pageNum,
                limit: isExport ? total : limit,
                totalPages
            }
        };
    }

    static async getStudentFilters(organizationId?: string) {
        const whereClause: any = organizationId ? { academicYear: { organizationId } } : {};
        
        const schoolGrades = await prisma.schoolGrade.findMany({
            where: whereClause,
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

        const academicYears = await prisma.academicYear.findMany({
            where: organizationId ? { organizationId } : {},
            orderBy: { startDate: "desc" },
            select: { id: true, name: true, isCurrent: true }
        });

        return {
            grades: gradesList,
            sections: sectionsList,
            academicYears
        };
    }

    static async getStudentById(id: string) {
        return prisma.student.findUnique({
            where: { id },
            include: {
                enrollments: {
                    include: {
                        academicYear: true,
                        schoolGrade: {
                            include: { grade: true }
                        },
                        section: true
                    },
                    orderBy: { createdAt: "desc" }
                },
                parents: {
                    include: { parent: true }
                },
                studentDocuments: true
            }
        });
    }

    static async enrollStudent(organizationId: string, studentId: string, academicYearId: string, schoolGradeId: string, sectionId?: string, enrollmentType?: EnrollmentType) {
        // Validate academic year state
        const academicYear = await prisma.academicYear.findFirst({
            where: { id: academicYearId, organizationId }
        });
        if (!academicYear) {
            throw new Error("Academic year not found or does not belong to this school organization");
        }
        if (academicYear.status === "ARCHIVED" || academicYear.status === "COMPLETED") {
            throw new Error(`Cannot enroll students in an ${academicYear.status.toLowerCase()} academic year`);
        }

        // Validate school grade ownership
        const schoolGrade = await prisma.schoolGrade.findFirst({
            where: {
                id: schoolGradeId,
                academicYearId,
                academicYear: {
                    organizationId
                }
            }
        });
        if (!schoolGrade) {
            throw new Error("School grade not found or does not belong to this school organization");
        }

        // Check if there is an active/enrolled enrollment in this academic year
        const activeEnrollment = await prisma.studentEnrollment.findFirst({
            where: {
                studentId,
                academicYearId,
                organizationId,
                status: {
                    in: ["ACTIVE", "ENROLLED"]
                }
            }
        });

        if (activeEnrollment) {
            throw new Error("Student is already actively enrolled in this academic year");
        }

        const enrollment = await prisma.studentEnrollment.create({
            data: {
                studentId,
                organizationId,
                academicYearId,
                schoolGradeId,
                sectionId: sectionId || null,
                enrollmentType: enrollmentType || EnrollmentType.NEW,
                status: EnrollmentStatus.ENROLLED
            }
        });

        await prisma.studentStatusHistory.create({
            data: {
                enrollmentId: enrollment.id,
                status: EnrollmentStatus.ENROLLED,
                reason: "Initial Enrollment"
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "STUDENT_ENROLLED",
                resource: "StudentEnrollment",
                resourceId: enrollment.id,
                newValue: JSON.parse(JSON.stringify(enrollment)),
            }
        });

        return enrollment;
    }

    static async getEnrollments(organizationId: string, academicYearId?: string) {
        return prisma.studentEnrollment.findMany({
            where: {
                organizationId,
                ...(academicYearId ? { academicYearId } : {})
            },
            include: {
                student: {
                    include: {
                        parents: { include: { parent: true } }
                    }
                },
                schoolGrade: { include: { grade: true } },
                section: true,
                academicYear: true,
                documents: true
            },
            orderBy: { createdAt: "desc" }
        });
    }

    static async transferStudent(organizationId: string, enrollmentId: string, targetSchoolGradeId: string, targetSectionId?: string, reason?: string) {
        const currentEnrollment = await prisma.studentEnrollment.findUnique({
            where: { id: enrollmentId, organizationId }
        });

        if (!currentEnrollment) {
            throw new Error("Enrollment not found");
        }

        if (currentEnrollment.status !== EnrollmentStatus.ACTIVE && currentEnrollment.status !== EnrollmentStatus.ENROLLED) {
            throw new Error("Cannot transfer a student who is not currently active or enrolled");
        }

        // Close current enrollment
        await prisma.studentEnrollment.update({
            where: { id: enrollmentId },
            data: { status: EnrollmentStatus.TRANSFERRED }
        });

        await prisma.studentStatusHistory.create({
            data: {
                enrollmentId: enrollmentId,
                status: EnrollmentStatus.TRANSFERRED,
                reason: reason || "Transferred to new section/grade"
            }
        });

        // Open new enrollment
        const newEnrollment = await prisma.studentEnrollment.create({
            data: {
                studentId: currentEnrollment.studentId,
                organizationId: currentEnrollment.organizationId,
                academicYearId: currentEnrollment.academicYearId,
                schoolGradeId: targetSchoolGradeId,
                sectionId: targetSectionId || null,
                enrollmentType: EnrollmentType.TRANSFER_IN,
                status: EnrollmentStatus.ACTIVE
            }
        });

        await prisma.studentStatusHistory.create({
            data: {
                enrollmentId: newEnrollment.id,
                status: EnrollmentStatus.ACTIVE,
                reason: reason || "Transfer received"
            }
        });

        return newEnrollment;
    }

    static async updateStudentStatus(organizationId: string, enrollmentId: string, status: EnrollmentStatus, reason?: string) {
        const enrollment = await prisma.studentEnrollment.findUnique({
            where: { id: enrollmentId, organizationId }
        });

        if (!enrollment) throw new Error("Enrollment not found");

        const updated = await prisma.studentEnrollment.update({
            where: { id: enrollmentId },
            data: { status }
        });

        await prisma.studentStatusHistory.create({
            data: {
                enrollmentId,
                status,
                reason: reason || null
            }
        });

        return updated;
    }

    static async getStudentByUserId(userId: string, organizationId?: string) {
        return prisma.student.findFirst({
            where: {
                userId,
                ...(organizationId ? {
                    enrollments: {
                        some: { organizationId }
                    }
                } : {})
            },
            include: {
                enrollments: {
                    ...(organizationId ? {
                        where: { organizationId }
                    } : {}),
                    include: {
                        schoolGrade: { include: { grade: true } },
                        section: true,
                        organization: true,
                        academicYear: true
                    },
                    orderBy: { createdAt: "desc" }
                },
                user: { select: { id: true, name: true, email: true } },
                parents: {
                    include: {
                        parent: {
                            include: {
                                user: { select: { id: true, name: true, email: true } }
                            }
                        }
                    }
                }
            }
        });
    }

    static async getStudentDashboard(userId: string, organizationId?: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        const enrollment = student?.enrollments[0];

        if (!student || !enrollment) return null;

        const effectiveOrgId = organizationId || enrollment.organizationId;

        const today = new Date();
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const tomorrow = new Date(todayStart);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const sectionFilter = enrollment.sectionId ? { sectionId: enrollment.sectionId } : undefined;

        const [todayClasses, weeklyClasses, subjects, attendance, results, activities, notifications, supportFlags, announcements] = await Promise.all([
            // 1. Today's classes
            sectionFilter ? prisma.timetable.findMany({
                where: {
                    organizationId: effectiveOrgId,
                    academicYearId: enrollment.academicYearId,
                    dayOfWeek: today.getDay(),
                    teachingAssignment: sectionFilter
                },
                include: {
                    classPeriod: true,
                    room: true,
                    teachingAssignment: {
                        include: { subject: true, teacher: true, section: true }
                    }
                },
                orderBy: { classPeriod: { startTime: "asc" } }
            }) : Promise.resolve([]),
            // 2. Full weekly timetable
            sectionFilter ? prisma.timetable.findMany({
                where: {
                    organizationId: effectiveOrgId,
                    academicYearId: enrollment.academicYearId,
                    teachingAssignment: sectionFilter
                },
                include: {
                    classPeriod: true,
                    room: true,
                    teachingAssignment: {
                        include: { subject: true, teacher: true, section: true }
                    }
                },
                orderBy: [
                    { dayOfWeek: "asc" },
                    { classPeriod: { startTime: "asc" } }
                ]
            }) : Promise.resolve([]),
            // 3. Section & Grade Teaching Assignments (Subjects and Teachers)
            prisma.teachingAssignment.findMany({
                where: {
                    academicYearId: enrollment.academicYearId,
                    ...(enrollment.sectionId ? {
                        OR: [
                            { sectionId: enrollment.sectionId },
                            { schoolGradeId: enrollment.schoolGradeId, sectionId: null }
                        ]
                    } : {
                        schoolGradeId: enrollment.schoolGradeId
                    })
                },
                include: {
                    subject: true,
                    teacher: true,
                    section: true
                },
                orderBy: { subject: { name: "asc" } }
            }),
            prisma.studentAttendance.findMany({
                where: { organizationId: effectiveOrgId, enrollmentId: enrollment.id },
                select: { status: true }
            }),
            prisma.studentResult.findMany({
                where: { enrollmentId: enrollment.id, assessment: { organizationId: effectiveOrgId } },
                include: {
                    assessment: {
                        include: { teachingAssignment: { include: { subject: true } } }
                    }
                },
                orderBy: { createdAt: "desc" },
                take: 5
            }),
            prisma.learningActivity.findMany({
                where: {
                    organizationId: effectiveOrgId,
                    academicYearId: enrollment.academicYearId,
                    ...(enrollment.sectionId ? { teachingAssignment: { sectionId: enrollment.sectionId } } : {}),
                    OR: [{ dueDate: null }, { dueDate: { gte: todayStart } }]
                },
                include: {
                    teachingAssignment: { include: { subject: true } },
                    submissions: { where: { enrollmentId: enrollment.id }, select: { status: true, submittedAt: true } }
                },
                orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
                take: 5
            }),
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: 5
            }),
            prisma.supportFlag.findMany({
                where: { organizationId: effectiveOrgId, enrollmentId: enrollment.id, resolvedAt: null },
                orderBy: { createdAt: "desc" },
                take: 5
            }),
            prisma.announcement.findMany({
                where: {
                    organizationId: effectiveOrgId,
                    OR: [
                        { target: AnnouncementTarget.ALL },
                        { target: AnnouncementTarget.STUDENTS },
                        ...(enrollment.schoolGradeId ? [{ target: AnnouncementTarget.SPECIFIC_GRADE, targetId: enrollment.schoolGradeId }] : []),
                        ...(enrollment.sectionId ? [{ target: AnnouncementTarget.SPECIFIC_SECTION, targetId: enrollment.sectionId }] : [])
                    ],
                    AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: todayStart } }] }]
                },
                orderBy: { createdAt: "desc" },
                take: 5
            })
        ]);

        const presentCount = attendance.filter(record => record.status === "PRESENT" || record.status === "EXCUSED").length;
        const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : null;

        return {
            student: {
                id: student.id,
                studentId: student.studentId,
                name: student.user?.name || [student.firstName, student.lastName].filter(Boolean).join(" "),
                photoUrl: student.photoUrl
            },
            enrollment,
            todayClasses,
            weeklyClasses,
            subjects: subjects.map(s => ({
                id: s.id,
                subject: {
                    id: s.subject.id,
                    name: s.subject.name,
                    code: s.subject.code
                },
                teacher: {
                    id: s.teacher.id,
                    firstName: s.teacher.firstName,
                    lastName: s.teacher.lastName,
                    fatherName: s.teacher.fatherName,
                    email: s.teacher.email,
                    phoneNumber: s.teacher.phoneNumber
                },
                section: s.section ? { id: s.section.id, name: s.section.name } : null,
                periodsPerWeek: s.periodsPerWeek
            })),
            attendance: { rate: attendanceRate, records: attendance.length },
            recentResults: results.map(result => ({
                id: result.id,
                title: result.assessment.title,
                subject: result.assessment.teachingAssignment.subject.name,
                score: result.score,
                maxScore: result.assessment.maxScore,
                percentage: Math.round((result.score / result.assessment.maxScore) * 100),
                feedback: result.feedback,
                publishedAt: result.createdAt
            })),
            upcomingActivities: activities,
            notifications,
            supportFlags,
            announcements,
            generatedAt: today.toISOString(),
            dateRange: { today: todayStart.toISOString(), tomorrow: tomorrow.toISOString() }
        };
    }

    static async getTransfers(organizationId: string) {
        return prisma.studentStatusHistory.findMany({
            where: {
                enrollment: { organizationId },
                status: "TRANSFERRED"
            },
            include: {
                enrollment: {
                    include: {
                        student: true,
                        schoolGrade: { include: { grade: true } },
                        section: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });
    }

    static async executeProgression(organizationId: string, data: any) {
        const { sourceGradeId, targetGradeId, academicYearId } = data;
        const eligibleEnrollments = await prisma.studentEnrollment.findMany({
            where: {
                organizationId,
                schoolGradeId: sourceGradeId,
                status: "ENROLLED"
            }
        });

        let promotedCount = 0;
        for (const enrollment of eligibleEnrollments) {
            await prisma.studentEnrollment.update({
                where: { id: enrollment.id },
                data: { status: EnrollmentStatus.GRADUATED }
            });

            await prisma.studentEnrollment.create({
                data: {
                    studentId: enrollment.studentId,
                    organizationId,
                    academicYearId,
                    schoolGradeId: targetGradeId,
                    enrollmentType: EnrollmentType.RETURNING,
                    status: "ENROLLED"
                }
            });
            promotedCount++;
        }

        return {
            success: true,
            promotedCount,
            message: `Successfully promoted ${promotedCount} students to next grade.`
        };
    }

    static async getApprovals(organizationId: string) {
        return prisma.auditLog.findMany({
            where: {
                organizationId,
                action: { in: ["STUDENT_RECORD_CORRECTION", "GRADE_CORRECTION_REQUEST"] }
            },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createApprovalRequest(organizationId: string, data: any) {
        return prisma.auditLog.create({
            data: {
                organizationId,
                userId: data.userId || null,
                action: "STUDENT_RECORD_CORRECTION",
                resource: "Student",
                resourceId: data.studentId,
                newValue: { reason: data.reason, correctedFields: data.correctedFields, status: "PENDING_PRINCIPAL_APPROVAL" }
            }
        });
    }

    static async getStudentAttendance(userId: string, organizationId: string, startDate?: string, endDate?: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        if (!student || !student.enrollments.length) return null;

        const enrollmentIds = student.enrollments.map(e => e.id);

        return prisma.studentAttendance.findMany({
            where: {
                organizationId,
                enrollmentId: { in: enrollmentIds },
                ...(startDate || endDate ? {
                    date: {
                        ...(startDate ? { gte: new Date(startDate) } : {}),
                        ...(endDate ? { lte: new Date(endDate) } : {})
                    }
                } : {})
            },
            include: { 
                classPeriod: true,
                recordedBy: { select: { id: true, name: true, email: true } }
            },
            orderBy: { date: "desc" }
        });
    }

    static async getStudentAttendanceTeachers(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        if (!student || !student.enrollments.length) return null;

        const enrollment = student.enrollments.find(e => e.status === "ENROLLED") || student.enrollments[0];
        if (!enrollment) return null;

        return prisma.teacher.findMany({
            where: {
                organizationId,
                assignments: {
                    some: {
                        OR: [
                            { sectionId: enrollment.sectionId },
                            { schoolGradeId: enrollment.schoolGradeId },
                            { sectionId: null }
                        ]
                    }
                }
            },
            select: { 
                id: true, 
                firstName: true, 
                lastName: true,
                email: true,
                photoUrl: true,
                assignments: {
                    where: {
                        OR: [
                            { sectionId: enrollment.sectionId },
                            { schoolGradeId: enrollment.schoolGradeId },
                            { sectionId: null }
                        ]
                    },
                    select: { subject: { select: { name: true, code: true } } }
                }
            },
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
        });
    }

    static async getStudentAttendanceExplanations(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        if (!student || !student.enrollments.length) return null;

        const enrollmentIds = student.enrollments.map(e => e.id);

        return prisma.supportFlag.findMany({
            where: {
                organizationId,
                enrollmentId: { in: enrollmentIds },
                type: "ATTENDANCE"
            },
            orderBy: { createdAt: "desc" }
        });
    }

    static async getStudentDigitalResources(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        if (!student || !student.enrollments.length) return null;

        const enrollment = student.enrollments.find(e => e.status === "ENROLLED") || student.enrollments[0];
        if (!enrollment) return null;

        const gradeLevel = enrollment.schoolGrade?.grade?.level;
        const gradeName = enrollment.schoolGrade?.grade?.name;

        const [digitalResources, learningMaterials] = await Promise.all([
            prisma.digitalResource.findMany({
                where: {
                    organizationId,
                    status: "PUBLISHED",
                    OR: [
                        { gradeName: null },
                        ...(gradeName ? [{ gradeName }] : []),
                        ...(gradeLevel ? [{ gradeName: String(gradeLevel) }, { gradeName: `Grade ${gradeLevel}` }] : [])
                    ]
                },
                include: {
                    recommendations: {
                        where: {
                            OR: [
                                { enrollmentId: enrollment.id },
                                { schoolGradeId: enrollment.schoolGradeId }
                            ]
                        },
                        select: { note: true, teacher: { select: { firstName: true, lastName: true } } }
                    }
                },
                orderBy: { createdAt: "desc" }
            }),
            (prisma as any).learningMaterial.findMany({
                where: {
                    organizationId,
                    OR: [
                        { gradeName: null },
                        ...(gradeName ? [{ gradeName: { contains: gradeName, mode: "insensitive" } }] : []),
                        ...(enrollment.section?.name ? [{ sectionName: enrollment.section.name }] : []),
                        { sectionName: null }
                    ]
                },
                orderBy: { createdAt: "desc" }
            }).catch(() => [])
        ]);

        const mappedMaterials = (learningMaterials || []).map((m: any) => ({
            id: m.id,
            organizationId: m.organizationId,
            title: m.title,
            description: m.description,
            subjectName: m.subjectName || "General",
            gradeName: m.gradeName || gradeName || null,
            resourceType: m.materialType === "VIDEO" ? "VIDEO" : (m.fileType || "DOCUMENT"),
            fileUrl: m.fileUrl || null,
            externalUrl: m.videoUrl || m.fileUrl || null,
            source: m.unitName ? `Teacher Material (Unit: ${m.unitName})` : "Teacher Learning Material",
            createdAt: m.createdAt,
            authorName: "Course Teacher",
            createdBy: { name: "Course Teacher" },
            isTeacherMaterial: true,
            isRecommended: true,
            recommendationNote: m.description || `Shared by your teacher for ${m.subjectName || "class"}.`,
            recommendations: []
        }));

        return [...mappedMaterials, ...digitalResources];
    }

    static async getStudentCommunicationTeachers(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        if (!student || !student.enrollments.length) return null;

        const enrollment = student.enrollments.find(e => e.status === "ENROLLED") || student.enrollments[0];
        if (!enrollment) return null;

        return prisma.teacher.findMany({
            where: {
                organizationId,
                assignments: {
                    some: {
                        OR: [
                            { sectionId: enrollment.sectionId },
                            { schoolGradeId: enrollment.schoolGradeId },
                            { sectionId: null }
                        ]
                    }
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
                userId: true,
                assignments: {
                    where: {
                        OR: [
                            { sectionId: enrollment.sectionId },
                            { schoolGradeId: enrollment.schoolGradeId },
                            { sectionId: null }
                        ]
                    },
                    select: { subject: { select: { name: true } } }
                }
            },
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
        });
    }

    static async getStudentAnnouncements(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        const enrollment = student?.enrollments[0];
        if (!student || !enrollment) return null;

        return prisma.announcement.findMany({
            where: {
                organizationId,
                OR: [
                    { target: "ALL" },
                    { target: "STUDENTS" },
                    { target: "SPECIFIC_GRADE", targetId: enrollment.schoolGradeId },
                    { target: "SPECIFIC_SECTION", targetId: enrollment.sectionId }
                ],
                AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] }]
            },
            include: {
                author: { select: { name: true } },
                acknowledgments: true
            },
            orderBy: [{ createdAt: "desc" }]
        });
    }

    static async getStudentNotifications(userId: string) {
        return prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async getStudentMessages(userId: string, organizationId: string, otherUserId?: string) {
        const teachers = await this.getStudentCommunicationTeachers(userId, organizationId);
        if (!teachers) return null;
        const teacherUserIds = teachers.map((teacher) => teacher.userId).filter((value): value is string => Boolean(value));
        if (otherUserId && !teacherUserIds.includes(otherUserId)) throw new Error("Teacher is not assigned to your current section");

        if (otherUserId) {
            await prisma.message.updateMany({
                where: {
                    senderId: otherUserId,
                    receiverId: userId,
                    isRead: false
                },
                data: { isRead: true }
            });
            getIO()?.to(`user:${otherUserId}`).emit("messages_read", { byUserId: userId });
        }

        return prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId, ...(otherUserId ? { receiverId: otherUserId } : {}) },
                    { receiverId: userId, ...(otherUserId ? { senderId: otherUserId } : {}) }
                ]
            },
            include: {
                sender: { select: { id: true, name: true } },
                receiver: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: "asc" }
        });
    }

    static async sendStudentMessage(userId: string, organizationId: string, receiverId: string, content: string) {
        const teachers = await this.getStudentCommunicationTeachers(userId, organizationId);
        if (!teachers) return null;
        const assignedTeacher = teachers.some((teacher) => teacher.userId === receiverId);
        if (!assignedTeacher) throw new Error("Teacher is not assigned to your current section");

        const message = await prisma.message.create({
            data: { organizationId, senderId: userId, receiverId, content },
            include: {
                sender: { select: { id: true, name: true } },
                receiver: { select: { id: true, name: true } }
            }
        });

        emitNewMessageToUsers(message);
        return message;
    }

    static async getStudentAssessments(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        if (!student || !student.enrollments.length) return null;

        const enrollment = student.enrollments.find(e => e.status === "ENROLLED") || student.enrollments[0];
        const enrollmentIds = student.enrollments.map(e => e.id);
        const sectionIds = student.enrollments.map(e => e.sectionId).filter(Boolean) as string[];
        const gradeIds = student.enrollments.map(e => e.schoolGradeId).filter(Boolean) as string[];

        return prisma.assessment.findMany({
            where: {
                organizationId,
                OR: [
                    { results: { some: { enrollmentId: { in: enrollmentIds } } } },
                    {
                        teachingAssignment: {
                            OR: [
                                ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : []),
                                ...(gradeIds.length ? [{ schoolGradeId: { in: gradeIds } }] : [])
                            ]
                        }
                    }
                ]
            },
            include: {
                teachingAssignment: {
                    include: { subject: true, teacher: true, schoolGrade: { include: { grade: true } }, section: true }
                },
                results: {
                    where: { enrollmentId: { in: enrollmentIds } },
                    include: {
                        gradedBy: { select: { id: true, name: true, email: true } }
                    }
                }
            },
            orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
        });
    }

    static async startStudentAssessment(userId: string, organizationId: string, assessmentId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        if (!student || !student.enrollments.length) throw new Error("Student enrollment not found");

        const enrollment = student.enrollments.find(e => e.status === "ENROLLED") || student.enrollments[0];
        if (!enrollment) throw new Error("Student enrollment not found");
        const sectionIds = student.enrollments.map(e => e.sectionId).filter(Boolean) as string[];
        const gradeIds = student.enrollments.map(e => e.schoolGradeId).filter(Boolean) as string[];

        const assessment = await prisma.assessment.findFirst({
            where: {
                id: assessmentId,
                organizationId,
                OR: [
                    { results: { some: { enrollmentId: enrollment.id } } },
                    {
                        teachingAssignment: {
                            OR: [
                                ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : []),
                                ...(gradeIds.length ? [{ schoolGradeId: { in: gradeIds } }] : [])
                            ]
                        }
                    }
                ]
            }
        });
        if (!assessment) throw new Error("Assessment not found or not assigned to your section");

        const existing = await prisma.studentResult.findUnique({
            where: {
                assessmentId_enrollmentId: {
                    assessmentId,
                    enrollmentId: enrollment.id
                }
            }
        });

        if (existing) {
            return existing;
        }

        return prisma.studentResult.create({
            data: {
                assessmentId,
                enrollmentId: enrollment.id,
                status: "IN_PROGRESS",
                startedAt: new Date()
            }
        });
    }

    static async submitStudentAssessment(userId: string, organizationId: string, assessmentId: string, data: { solutionNotes?: string; score?: number }) {
        const student = await this.getStudentByUserId(userId, organizationId);
        if (!student || !student.enrollments.length) throw new Error("Student enrollment not found");

        const enrollment = student.enrollments.find(e => e.status === "ENROLLED") || student.enrollments[0];
        if (!enrollment) throw new Error("Student enrollment not found");
        const sectionIds = student.enrollments.map(e => e.sectionId).filter(Boolean) as string[];
        const gradeIds = student.enrollments.map(e => e.schoolGradeId).filter(Boolean) as string[];

        const assessment = await prisma.assessment.findFirst({
            where: {
                id: assessmentId,
                organizationId,
                OR: [
                    { results: { some: { enrollmentId: enrollment.id } } },
                    {
                        teachingAssignment: {
                            OR: [
                                ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : []),
                                ...(gradeIds.length ? [{ schoolGradeId: { in: gradeIds } }] : [])
                            ]
                        }
                    }
                ]
            }
        });
        if (!assessment) throw new Error("Assessment not found or not assigned to your section");

        const existing = await prisma.studentResult.findUnique({
            where: {
                assessmentId_enrollmentId: {
                    assessmentId,
                    enrollmentId: enrollment.id
                }
            }
        });

        const feedbackText = data.solutionNotes?.trim() ? `Submission Note: ${data.solutionNotes.trim()}` : undefined;

        if (existing) {
            return prisma.studentResult.update({
                where: { id: existing.id },
                data: {
                    status: existing.status === "GRADED" ? "GRADED" : "SUBMITTED",
                    submittedAt: new Date(),
                    ...(feedbackText && !existing.feedback ? { feedback: feedbackText } : {})
                }
            });
        }

        return prisma.studentResult.create({
            data: {
                assessmentId,
                enrollmentId: enrollment.id,
                status: "SUBMITTED",
                startedAt: new Date(),
                submittedAt: new Date(),
                feedback: feedbackText
            }
        });
    }

    static async submitStudentLearningActivity(userId: string, organizationId: string, activityId: string, data: { contentUrl?: string; notes?: string }) {
        const student = await this.getStudentByUserId(userId, organizationId);
        if (!student || !student.enrollments.length) throw new Error("Student enrollment not found");

        const enrollment = student.enrollments.find(e => e.status === "ENROLLED") || student.enrollments[0];
        if (!enrollment) throw new Error("Student enrollment not found");
        const sectionIds = student.enrollments.map(e => e.sectionId).filter(Boolean) as string[];
        const gradeIds = student.enrollments.map(e => e.schoolGradeId).filter(Boolean) as string[];

        const activity = await prisma.learningActivity.findFirst({
            where: {
                id: activityId,
                organizationId,
                OR: [
                    { submissions: { some: { enrollmentId: enrollment.id } } },
                    {
                        teachingAssignment: {
                            OR: [
                                ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : []),
                                ...(gradeIds.length ? [{ schoolGradeId: { in: gradeIds } }] : [])
                            ]
                        }
                    }
                ]
            },
            include: {
                teachingAssignment: {
                    include: { teacher: true, subject: true }
                }
            }
        });
        if (!activity) throw new Error("Learning activity not found or not assigned to your section");

        const submission = await prisma.submission.upsert({
            where: {
                learningActivityId_enrollmentId: {
                    learningActivityId: activityId,
                    enrollmentId: enrollment.id
                }
            },
            update: {
                status: "SUBMITTED",
                submittedAt: new Date(),
                contentUrl: data.contentUrl || data.notes || undefined
            },
            create: {
                learningActivityId: activityId,
                enrollmentId: enrollment.id,
                status: "SUBMITTED",
                submittedAt: new Date(),
                contentUrl: data.contentUrl || data.notes || null
            }
        });

        // Notify teacher if teacher has user account
        if (activity.teachingAssignment?.teacher?.userId) {
            await prisma.notification.create({
                data: {
                    organizationId,
                    userId: activity.teachingAssignment.teacher.userId,
                    title: "Student Assignment Submitted",
                    content: `${student.firstName} ${student.lastName} submitted work for "${activity.title}".`,
                    link: "/dashboard/teacher/submissions",
                    type: "ACADEMIC"
                }
            }).catch(() => null);
        }

        return submission;
    }

    static async getStudentLearningActivities(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        if (!student || !student.enrollments.length) return null;

        const enrollment = student.enrollments.find(e => e.status === "ENROLLED") || student.enrollments[0];
        const enrollmentIds = student.enrollments.map(e => e.id);
        const sectionIds = student.enrollments.map(e => e.sectionId).filter(Boolean) as string[];
        const gradeIds = student.enrollments.map(e => e.schoolGradeId).filter(Boolean) as string[];

        return prisma.learningActivity.findMany({
            where: {
                organizationId,
                OR: [
                    { submissions: { some: { enrollmentId: { in: enrollmentIds } } } },
                    {
                        teachingAssignment: {
                            OR: [
                                ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : []),
                                ...(gradeIds.length ? [{ schoolGradeId: { in: gradeIds } }] : [])
                            ]
                        }
                    }
                ]
            },
            include: {
                teachingAssignment: {
                    include: {
                        subject: true,
                        teacher: true,
                        schoolGrade: { include: { grade: true } },
                        section: true
                    }
                },
                submissions: {
                    where: { enrollmentId: { in: enrollmentIds } },
                    include: { activity: true }
                }
            },
            orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
        });
    }

    static async getStudentLearningSubmissions(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        if (!student || !student.enrollments.length) return null;

        const enrollmentIds = student.enrollments.map(e => e.id);

        return prisma.submission.findMany({
            where: {
                enrollmentId: { in: enrollmentIds }
            },
            include: {
                activity: {
                    include: {
                        teachingAssignment: {
                            include: {
                                subject: true,
                                teacher: true,
                                schoolGrade: { include: { grade: true } },
                                section: true
                            }
                        }
                    }
                }
            },
            orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }]
        });
    }

    static async getStudentSupportActivities(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        if (!student || !student.enrollments.length) return null;

        const enrollment = student.enrollments.find(e => e.status === "ENROLLED") || student.enrollments[0];
        if (!enrollment) return null;
        const enrollmentIds = student.enrollments.map(e => e.id);

        const activities = await prisma.learningActivity.findMany({
            where: {
                organizationId,
                supportCategory: { in: ["RECOMMENDATION", "REMEDIAL", "ENRICHMENT"] },
                OR: [
                    { submissions: { some: { enrollmentId: { in: enrollmentIds } } } },
                    {
                        teachingAssignment: {
                            OR: [
                                ...(enrollment.sectionId ? [{ sectionId: enrollment.sectionId }] : []),
                                ...(enrollment.schoolGradeId ? [{ schoolGradeId: enrollment.schoolGradeId }] : [])
                            ]
                        }
                    }
                ]
            },
            include: {
                teachingAssignment: {
                    include: { subject: true, teacher: true }
                },
                submissions: {
                    where: { enrollmentId: { in: enrollmentIds } },
                    select: { status: true, submittedAt: true, grade: true, feedback: true }
                }
            },
            orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
        });

        const assignedActivities = activities.map(({ submissions, ...activity }) => ({
            ...activity,
            submission: submissions[0] ?? null
        }));

        const remedialAssignments = await prisma.remedialProgramAssignment.findMany({
            where: {
                enrollmentId: enrollment.id,
                remedialProgram: { organizationId }
            },
            include: { remedialProgram: true },
            orderBy: { assignedAt: "desc" }
        });

        const assignedPrograms = remedialAssignments.map(({ id, assignedAt, remedialProgram }) => {
            const teacherName = remedialProgram.leadTeacher.trim().split(/\s+/);
            return {
                id: `remedial-${id}`,
                title: remedialProgram.programTitle,
                description: `Scheduled support: ${remedialProgram.scheduleTime}`,
                type: "REMEDIAL_PROGRAM",
                supportCategory: "REMEDIAL",
                dueDate: null,
                createdAt: assignedAt,
                teachingAssignment: {
                    subject: { name: remedialProgram.subjectName },
                    teacher: { firstName: teacherName[0] || "", lastName: teacherName.slice(1).join(" ") }
                },
                submission: { status: "ASSIGNED", submittedAt: null, grade: null, feedback: null }
            };
        });

        const visibleActivities = [...assignedActivities, ...assignedPrograms].sort((left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        );

        const [interventionPlans, interventionMonitoring, interventionOutcomes] = await Promise.all([
            prisma.interventionPlan.findMany({
                where: { organizationId, studentId: student.id },
                select: { id: true, targetScore: true, counselorName: true, reviewDate: true, status: true, createdAt: true },
                orderBy: { createdAt: "desc" }
            }),
            prisma.interventionMonitoring.findMany({
                where: { organizationId, studentId: student.id },
                select: { id: true, programName: true, attendanceRate: true, status: true, lastCheckInDate: true },
                orderBy: { lastCheckInDate: "desc" }
            }),
            prisma.interventionOutcome.findMany({
                where: { organizationId, studentId: student.id },
                select: { id: true, initialScore: true, postScore: true, gain: true, status: true, createdAt: true },
                orderBy: { createdAt: "desc" }
            })
        ]);

        return { activities: visibleActivities, interventionPlans, interventionMonitoring, interventionOutcomes };
    }

    static async submitAttendanceExplanation(userId: string, organizationId: string, absenceDate: string, recipientTeacherId: string, description: string, attachmentData?: string, attachmentName?: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        const enrollment = student?.enrollments[0];
        if (!student || !enrollment) return null;

        const teacher = await prisma.teacher.findFirst({
            where: {
                id: recipientTeacherId,
                organizationId,
                assignments: {
                    some: {
                        academicYearId: enrollment.academicYearId,
                        schoolGradeId: enrollment.schoolGradeId,
                        OR: [
                            { sectionId: enrollment.sectionId },
                            { sectionId: null }
                        ]
                    }
                }
            }
        });
        if (!teacher) throw new Error("Selected teacher is not assigned to your section");

        const flag = await prisma.supportFlag.create({
            data: {
                organizationId,
                enrollmentId: enrollment.id,
                type: "ATTENDANCE",
                description,
                absenceDate: new Date(absenceDate),
                recipientTeacherId: teacher.id,
                attachmentData: attachmentData || null,
                attachmentName: attachmentName || null,
                raisedById: userId
            }
        });

        if (teacher.userId) {
            await prisma.notification.create({
                data: {
                    organizationId,
                    userId: teacher.userId,
                    title: "Attendance Excuse Submitted",
                    content: `${student.firstName} ${student.lastName} submitted an absence explanation for ${new Date(absenceDate).toLocaleDateString()}: "${description.slice(0, 120)}"`,
                    link: "/dashboard/teacher"
                }
            }).catch((err) => console.warn("Could not dispatch notification to teacher", err));
        }

        return flag;
    }
}
