import { prisma } from "../../infrastructure/prisma/client.js";
import { EnrollmentStatus, EnrollmentType, DocumentVerificationStatus } from "../../generated/prisma/enums.js";

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
        return await prisma.$transaction(async (tx) => {
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
                    parent = await tx.parent.findFirst({
                        where: { phoneNumber: phone }
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

    static async getStudents() {
        return prisma.student.findMany();
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

    static async getStudentByUserId(userId: string, organizationId: string) {
        return prisma.student.findFirst({
            where: { 
                userId,
                enrollments: {
                    some: {
                        organizationId,
                        status: { in: ["ENROLLED", "ACTIVE"] }
                    }
                }
            },
            include: {
                enrollments: {
                    where: {
                        organizationId,
                        status: { in: ["ENROLLED", "ACTIVE"] }
                    },
                    include: {
                        schoolGrade: { include: { grade: true } },
                        section: true,
                        organization: true,
                        academicYear: true
                    }
                }
            }
        });
    }

    static async getStudentDashboard(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        const enrollment = student?.enrollments[0];

        if (!student || !enrollment) return null;

        const today = new Date();
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const tomorrow = new Date(todayStart);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [todayClasses, attendance, results, activities, notifications, supportFlags, announcements] = await Promise.all([
            prisma.timetable.findMany({
                where: {
                    organizationId,
                    academicYearId: enrollment.academicYearId,
                    dayOfWeek: today.getDay(),
                    teachingAssignment: { sectionId: enrollment.sectionId }
                },
                include: {
                    classPeriod: true,
                    teachingAssignment: {
                        include: { subject: true, teacher: true }
                    }
                },
                orderBy: { classPeriod: { startTime: "asc" } }
            }),
            prisma.studentAttendance.findMany({
                where: { organizationId, enrollmentId: enrollment.id },
                select: { status: true }
            }),
            prisma.studentResult.findMany({
                where: { enrollmentId: enrollment.id, assessment: { organizationId } },
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
                    organizationId,
                    academicYearId: enrollment.academicYearId,
                    teachingAssignment: { sectionId: enrollment.sectionId },
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
                where: { organizationId, enrollmentId: enrollment.id, resolvedAt: null },
                orderBy: { createdAt: "desc" },
                take: 5
            }),
            prisma.announcement.findMany({
                where: {
                    organizationId,
                    OR: [
                        { target: "ALL" },
                        { target: "STUDENTS" },
                        { target: "SPECIFIC_GRADE", targetId: enrollment.schoolGradeId },
                        { target: "SPECIFIC_SECTION", targetId: enrollment.sectionId }
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
                name: [student.firstName, student.lastName].filter(Boolean).join(" "),
                photoUrl: student.photoUrl
            },
            enrollment,
            todayClasses,
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
}
