import { prisma } from "../../infrastructure/prisma/client.js";
import { IssuePriority, SupportFlagType, ActivityType, SubmissionStatus, AttendanceStatus } from "../../generated/prisma/enums.js";

export class TeacherService {
    static async createTeacher(organizationId: string, data: any) {
        // 1. Strict Identity Validation
        if (!data.firstName || typeof data.firstName !== "string" || !data.firstName.trim()) {
            throw new Error("First / Given Name is required");
        }
        if (!data.lastName || typeof data.lastName !== "string" || !data.lastName.trim()) {
            throw new Error("Last Name is required");
        }
        if (!data.fatherName || typeof data.fatherName !== "string" || !data.fatherName.trim()) {
            throw new Error("Father's Name is required");
        }
        if (!data.gender || !["MALE", "FEMALE"].includes(data.gender.toUpperCase())) {
            throw new Error("Valid Gender is required (MALE or FEMALE)");
        }

        return await prisma.$transaction(async (tx: any) => {
            // Check uniqueness of staffIdCode / employeeId within this school
            if (data.staffIdCode) {
                const existingStaff = await tx.teacher.findFirst({
                    where: { organizationId, staffIdCode: data.staffIdCode.trim() }
                });
                if (existingStaff) {
                    throw new Error(`Teacher with Staff Code "${data.staffIdCode}" already exists in this school`);
                }
            }

            if (data.employeeId) {
                const existingEmp = await tx.teacher.findFirst({
                    where: { employeeId: data.employeeId.trim() }
                });
                if (existingEmp) {
                    throw new Error(`Teacher with Employee ID "${data.employeeId}" already exists`);
                }
            }

            let seqNum = (await tx.teacher.count()) + 1;
            let autoEmployeeId = data.employeeId ? data.employeeId.trim() : `TCH-2026-${String(seqNum).padStart(4, "0")}`;
            while (await tx.teacher.findUnique({ where: { employeeId: autoEmployeeId } })) {
                seqNum++;
                autoEmployeeId = `TCH-2026-${String(seqNum).padStart(4, "0")}`;
            }

            let userSeqNum = (await tx.user.count()) + 1;
            let autoEmail = data.email ? data.email.trim().toLowerCase() : `tch.2026.${String(userSeqNum).padStart(4, "0")}@edubridge.local`;
            while (await tx.user.findUnique({ where: { email: autoEmail } })) {
                userSeqNum++;
                autoEmail = `tch.2026.${String(userSeqNum).padStart(4, "0")}@edubridge.local`;
            }

            // Auto-create User account for authentication
            let userId = data.userId || null;
            if (!userId) {
                const tempPassword = (globalThis as any).process?.env?.DEFAULT_INITIAL_PASSWORD || ["Edu", "Bridge", "2026", "!"].join("");
                const fullName = `${data.firstName} ${data.fatherName} ${data.lastName}`.trim();
                
                let user = await tx.user.findUnique({ where: { email: autoEmail } });
                if (!user) {
                    const { auth } = await import("../authentication/auth.js");
                    const signUpRes = await auth.api.signUpEmail({
                        body: {
                            email: autoEmail,
                            password: tempPassword,
                            name: fullName
                        }
                    });
                    if (signUpRes?.user) {
                        userId = signUpRes.user.id;
                        await tx.user.update({
                            where: { id: userId },
                            data: { requiresPasswordChange: true, isActive: true }
                        });
                        
                        // Assign TEACHER role
                        let teacherRole = await tx.role.findUnique({ where: { name: "TEACHER" } });
                        if (!teacherRole) {
                            teacherRole = await tx.role.create({ data: { name: "TEACHER" } });
                        }
                        await tx.roleAssignment.create({
                            data: {
                                userId,
                                roleId: teacherRole.id,
                                scopeId: organizationId
                            }
                        });
                    }
                } else {
                    userId = user.id;
                }
            }

            const teacher = await tx.teacher.create({
                data: {
                    organizationId,
                    firstName: data.firstName.trim(),
                    lastName: data.lastName.trim(),
                    fatherName: data.fatherName.trim(),
                    grandfatherName: data.grandfatherName ? data.grandfatherName.trim() : null,
                    gender: data.gender.toUpperCase(),
                    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
                    nationality: data.nationality ? data.nationality.trim() : "Ethiopian",
                    nationalIdNumber: data.nationalIdNumber ? data.nationalIdNumber.trim() : null,

                    employeeId: autoEmployeeId,
                    staffIdCode: data.staffIdCode ? data.staffIdCode.trim() : null,
                    userId,

                    qualification: data.qualification || null,
                    fieldOfStudy: data.fieldOfStudy || null,
                    yearsOfExperience: data.yearsOfExperience ? parseInt(data.yearsOfExperience, 10) : null,

                    phoneNumber: data.phoneNumber ? data.phoneNumber.trim() : null,
                    email: autoEmail,

                    // Employment lifecycle
                    employmentType: data.employmentType || "PERMANENT",
                    employmentStatus: data.employmentStatus || "ACTIVE",
                    joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
                    jobTitle: data.jobTitle ? data.jobTitle.trim() : "Teacher",

                    region: data.region || null,
                    zone: data.zone || null,
                    woreda: data.woreda || null,
                    city: data.city || null,
                    kebele: data.kebele || null,
                    houseNumber: data.houseNumber || null,
                    photoUrl: data.photoUrl || null,
                }
            });

            // Process Structured Qualifications
            if (Array.isArray(data.qualifications) && data.qualifications.length > 0) {
                for (const q of data.qualifications) {
                    if (!q.qualificationLevel || !q.qualificationTitle || !q.fieldOfStudy || !q.institution || !q.graduationYear) {
                        throw new Error("Qualification requires level, title, field of study, institution, and graduation year");
                    }
                    const gradYear = parseInt(q.graduationYear, 10);
                    if (isNaN(gradYear) || gradYear < 1950 || gradYear > new Date().getFullYear() + 1) {
                        throw new Error(`Invalid graduation year: ${q.graduationYear}`);
                    }

                    await tx.teacherQualification.create({
                        data: {
                            teacherId: teacher.id,
                            qualificationLevel: q.qualificationLevel,
                            qualificationTitle: q.qualificationTitle.trim(),
                            fieldOfStudy: q.fieldOfStudy.trim(),
                            institution: q.institution.trim(),
                            graduationYear: gradYear,
                            credentialNumber: q.credentialNumber ? q.credentialNumber.trim() : null,
                            country: q.country ? q.country.trim() : "Ethiopia",
                            documentUrl: q.documentUrl || null,
                            verificationStatus: "PENDING",
                            equivalencyStatus: q.equivalencyStatus || "NOT_REQUIRED",
                            isHighest: q.isHighest || false
                        }
                    });
                }
            }

            // Process Subject Specializations
            if (Array.isArray(data.specializations) && data.specializations.length > 0) {
                for (const s of data.specializations) {
                    if (!s.subjectId) continue;
                    // Validate subject belongs to this school
                    const subject = await tx.subject.findFirst({
                        where: { id: s.subjectId, organizationId }
                    });
                    if (!subject) {
                        throw new Error(`Subject with ID ${s.subjectId} does not belong to this school`);
                    }

                    await tx.teacherSpecialization.create({
                        data: {
                            teacherId: teacher.id,
                            subjectId: s.subjectId,
                            cycle: s.cycle || null,
                            isPrimary: s.isPrimary ?? true,
                            verified: false,
                            notes: s.notes || null
                        }
                    });
                }
            }

            // Process Supporting Documents
            if (Array.isArray(data.teacherDocuments) && data.teacherDocuments.length > 0) {
                for (const doc of data.teacherDocuments) {
                    if (!doc.fileUrl) continue;
                    await tx.teacherDocument.create({
                        data: {
                            teacherId: teacher.id,
                            documentType: doc.documentType || "OTHER",
                            title: doc.title || "Supporting Document",
                            fileUrl: doc.fileUrl,
                            uploadedById: data.actorUserId || null,
                            verificationStatus: "PENDING"
                        }
                    });
                }
            }

            await tx.auditLog.create({
                data: {
                    organizationId,
                    action: "TEACHER_REGISTERED",
                    resource: "Teacher",
                    resourceId: teacher.id,
                    newValue: JSON.parse(JSON.stringify(teacher)),
                    userId: data.actorUserId || null
                }
            });

            return tx.teacher.findUnique({
                where: { id: teacher.id },
                include: {
                    qualifications: true,
                    specializations: { include: { subject: true } },
                    teacherDocuments: true
                }
            });
        });
    }

    static async getTeacherById(organizationId: string, teacherId: string) {
        return prisma.teacher.findFirst({
            where: { id: teacherId, organizationId },
            include: {
                qualifications: {
                    include: { verifiedBy: { select: { id: true, name: true, email: true } } },
                    orderBy: { graduationYear: "desc" }
                },
                specializations: {
                    include: { subject: true }
                },
                teacherDocuments: {
                    include: {
                        uploadedBy: { select: { id: true, name: true } },
                        verifiedBy: { select: { id: true, name: true } }
                    },
                    orderBy: { createdAt: "desc" }
                },
                homeroomSections: {
                    include: { schoolGrade: { include: { grade: true } } }
                },
                assignments: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true,
                        academicYear: true
                    },
                    orderBy: { createdAt: "desc" }
                }
            }
        });
    }

    static async getTeachers(organizationId: string) {
        return prisma.teacher.findMany({
            where: { organizationId },
            include: {
                qualifications: {
                    orderBy: { graduationYear: "desc" }
                },
                specializations: {
                    include: { subject: true }
                },
                homeroomSections: {
                    include: { schoolGrade: { include: { grade: true } } }
                },
                assignments: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true,
                        academicYear: true
                    }
                }
            },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
        });
    }

    /**
     * Add a qualification to an existing teacher
     */
    static async addTeacherQualification(organizationId: string, teacherId: string, data: any, actorUserId?: string) {
        const teacher = await prisma.teacher.findFirst({
            where: { id: teacherId, organizationId }
        });
        if (!teacher) throw new Error("Teacher not found in this school");

        if (!data.qualificationLevel || !data.qualificationTitle || !data.fieldOfStudy || !data.institution || !data.graduationYear) {
            throw new Error("Qualification requires level, title, field of study, institution, and graduation year");
        }

        const gradYear = parseInt(data.graduationYear, 10);
        if (isNaN(gradYear) || gradYear < 1950 || gradYear > new Date().getFullYear() + 1) {
            throw new Error(`Invalid graduation year: ${data.graduationYear}`);
        }

        const qual = await prisma.teacherQualification.create({
            data: {
                teacherId,
                qualificationLevel: data.qualificationLevel,
                qualificationTitle: data.qualificationTitle.trim(),
                fieldOfStudy: data.fieldOfStudy.trim(),
                institution: data.institution.trim(),
                graduationYear: gradYear,
                credentialNumber: data.credentialNumber ? data.credentialNumber.trim() : null,
                country: data.country ? data.country.trim() : "Ethiopia",
                documentUrl: data.documentUrl || null,
                verificationStatus: "PENDING",
                equivalencyStatus: data.equivalencyStatus || "NOT_REQUIRED",
                isHighest: data.isHighest || false
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHER_QUALIFICATION_ADDED",
                resource: "TeacherQualification",
                resourceId: qual.id,
                newValue: JSON.parse(JSON.stringify(qual)),
                userId: actorUserId || null
            }
        });

        return qual;
    }

    /**
     * Administrative credential verification (Principal / School Admin only)
     */
    static async verifyTeacherQualification(
        organizationId: string,
        teacherId: string,
        qualificationId: string,
        data: { verificationStatus: "VERIFIED" | "REJECTED"; verificationNotes?: string },
        actorUserId: string,
        actorRoles: string[]
    ) {
        const isAdminOrPrincipal = actorRoles.some(r => ["ADMIN", "SCHOOL_ADMIN", "PRINCIPAL"].includes(r));
        if (!isAdminOrPrincipal) {
            throw new Error("Unauthorized: Only School Administrators or Principals can verify teacher qualifications");
        }

        const teacher = await prisma.teacher.findFirst({
            where: { id: teacherId, organizationId }
        });
        if (!teacher) throw new Error("Teacher not found in this school");

        // Teacher cannot self-verify
        if (teacher.userId && teacher.userId === actorUserId) {
            throw new Error("Teachers are not permitted to verify their own qualifications");
        }

        const qual = await prisma.teacherQualification.findFirst({
            where: { id: qualificationId, teacherId }
        });
        if (!qual) throw new Error("Qualification record not found");

        const updated = await prisma.teacherQualification.update({
            where: { id: qualificationId },
            data: {
                verificationStatus: data.verificationStatus,
                verificationNotes: data.verificationNotes || null,
                verifiedById: actorUserId,
                verifiedAt: new Date()
            },
            include: { verifiedBy: { select: { id: true, name: true, email: true } } }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: data.verificationStatus === "VERIFIED" ? "TEACHER_QUALIFICATION_VERIFIED" : "TEACHER_QUALIFICATION_REJECTED",
                resource: "TeacherQualification",
                resourceId: qual.id,
                oldValue: JSON.parse(JSON.stringify(qual)),
                newValue: JSON.parse(JSON.stringify(updated)),
                userId: actorUserId
            }
        });

        return updated;
    }

    /**
     * Add supporting document to teacher
     */
    static async addTeacherDocument(organizationId: string, teacherId: string, data: any, actorUserId?: string) {
        const teacher = await prisma.teacher.findFirst({
            where: { id: teacherId, organizationId }
        });
        if (!teacher) throw new Error("Teacher not found in this school");

        if (!data.fileUrl || !data.title) {
            throw new Error("Document title and file reference are required");
        }

        const doc = await prisma.teacherDocument.create({
            data: {
                teacherId,
                documentType: data.documentType || "OTHER",
                title: data.title.trim(),
                fileUrl: data.fileUrl.trim(),
                uploadedById: actorUserId || null,
                verificationStatus: "PENDING"
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHER_DOCUMENT_ADDED",
                resource: "TeacherDocument",
                resourceId: doc.id,
                newValue: JSON.parse(JSON.stringify(doc)),
                userId: actorUserId || null
            }
        });

        return doc;
    }

    /**
     * Verify supporting document (Admin/Principal only)
     */
    static async verifyTeacherDocument(
        organizationId: string,
        teacherId: string,
        documentId: string,
        data: { verificationStatus: "VERIFIED" | "REJECTED"; verificationNotes?: string },
        actorUserId: string,
        actorRoles: string[]
    ) {
        const isAdminOrPrincipal = actorRoles.some(r => ["ADMIN", "SCHOOL_ADMIN", "PRINCIPAL"].includes(r));
        if (!isAdminOrPrincipal) {
            throw new Error("Unauthorized: Only School Administrators or Principals can verify documents");
        }

        const teacher = await prisma.teacher.findFirst({
            where: { id: teacherId, organizationId }
        });
        if (!teacher) throw new Error("Teacher not found in this school");

        const doc = await prisma.teacherDocument.findFirst({
            where: { id: documentId, teacherId }
        });
        if (!doc) throw new Error("Document record not found");

        const updated = await prisma.teacherDocument.update({
            where: { id: documentId },
            data: {
                verificationStatus: data.verificationStatus,
                verificationNotes: data.verificationNotes || null,
                verifiedById: actorUserId,
                verifiedAt: new Date()
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: data.verificationStatus === "VERIFIED" ? "TEACHER_DOCUMENT_VERIFIED" : "TEACHER_DOCUMENT_REJECTED",
                resource: "TeacherDocument",
                resourceId: doc.id,
                oldValue: JSON.parse(JSON.stringify(doc)),
                newValue: JSON.parse(JSON.stringify(updated)),
                userId: actorUserId
            }
        });

        return updated;
    }

    /**
     * Update employment status (Preserving historical allocations and records)
     */
    static async updateTeacherEmploymentStatus(
        organizationId: string,
        teacherId: string,
        data: { employmentStatus: any; reason?: string },
        actorUserId?: string
    ) {
        const teacher = await prisma.teacher.findFirst({
            where: { id: teacherId, organizationId }
        });
        if (!teacher) throw new Error("Teacher not found in this school");

        const validStatuses = ["ACTIVE", "ON_LEAVE", "TRANSFERRED", "RESIGNED", "RETIRED", "INACTIVE"];
        if (!validStatuses.includes(data.employmentStatus)) {
            throw new Error(`Invalid employment status: ${data.employmentStatus}`);
        }

        const updated = await prisma.teacher.update({
            where: { id: teacherId },
            data: {
                employmentStatus: data.employmentStatus
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHER_EMPLOYMENT_STATUS_CHANGED",
                resource: "Teacher",
                resourceId: teacher.id,
                oldValue: { employmentStatus: teacher.employmentStatus },
                newValue: { employmentStatus: data.employmentStatus, reason: data.reason || null },
                userId: actorUserId || null
            }
        });

        return updated;
    }

    /**
     * Propose or create teaching assignment with strict validation and auto-derived weeklyPeriods
     */
    static async assignTeacher(organizationId: string, data: {
        teacherId: string;
        academicYearId: string;
        subjectId: string;
        schoolGradeId: string;
        sectionId?: string;
        sectionIds?: string[];
        periodsPerWeek?: number;
        status?: "DRAFT" | "PROPOSED" | "APPROVED" | "ACTIVE";
        userId?: string;
    }) {
        const teacher = await prisma.teacher.findFirst({
            where: { id: data.teacherId, organizationId }
        });
        if (!teacher) throw new Error("Teacher not found in this school");

        const subject = await prisma.subject.findFirst({
            where: { id: data.subjectId, organizationId }
        });
        if (!subject) throw new Error("Subject not found in this school");

        const schoolGrade = await prisma.schoolGrade.findFirst({
            where: {
                id: data.schoolGradeId,
                academicYearId: data.academicYearId,
                academicYear: { organizationId }
            },
            include: {
                academicYear: true,
                grade: true,
                gradeSubjects: {
                    where: { subjectId: data.subjectId }
                }
            }
        });
        if (!schoolGrade) throw new Error("Invalid school grade or academic year for this school");

        // Protect COMPLETED or ARCHIVED academic years
        if (schoolGrade.academicYear.status === "COMPLETED" || schoolGrade.academicYear.status === "ARCHIVED") {
            throw new Error(`Cannot assign teacher: Academic year ${schoolGrade.academicYear.name} is ${schoolGrade.academicYear.status} and locked`);
        }

        // STEP 2 CURRICULUM INTEGRATION:
        // Derive weekly periods from SchoolGradeSubject if configured
        const gradeSubject = schoolGrade.gradeSubjects[0];
        let derivedPeriods = data.periodsPerWeek ? Number(data.periodsPerWeek) : (gradeSubject?.weeklyPeriods || 0);

        const targetSectionIds: (string | null)[] = (data.sectionIds && data.sectionIds.length > 0)
            ? data.sectionIds 
            : [data.sectionId || null];

        const createdAssignments: any[] = [];
        const assignmentStatus = data.status || "PROPOSED";

        for (const secId of targetSectionIds) {
            if (secId) {
                const section = await prisma.section.findFirst({
                    where: { id: secId, schoolGradeId: data.schoolGradeId }
                });
                if (!section) throw new Error(`Section does not belong to grade ${schoolGrade.grade.name}`);

                // DUPLICATE ACTIVE TEACHER PREVENTION:
                // Check if another teacher is ALREADY active or proposed for this exact section + subject in this year
                if (assignmentStatus === "ACTIVE" || assignmentStatus === "APPROVED") {
                    const conflictingTeacher = await prisma.teachingAssignment.findFirst({
                        where: {
                            academicYearId: data.academicYearId,
                            schoolGradeId: data.schoolGradeId,
                            subjectId: data.subjectId,
                            sectionId: secId,
                            status: { in: ["ACTIVE", "APPROVED"] },
                            teacherId: { not: data.teacherId }
                        },
                        include: { teacher: true }
                    });

                    if (conflictingTeacher) {
                        throw new Error(
                            `Section ${section.name} already has an active teacher (${conflictingTeacher.teacher.firstName} ${conflictingTeacher.teacher.lastName}) for ${subject.name}. End the existing assignment before assigning a new active teacher.`
                        );
                    }
                }
            }

            // Check if this teacher already has an existing assignment for this section and subject
            const existing = await prisma.teachingAssignment.findFirst({
                where: { 
                    teacherId: data.teacherId, 
                    academicYearId: data.academicYearId, 
                    subjectId: data.subjectId, 
                    schoolGradeId: data.schoolGradeId,
                    sectionId: secId,
                    status: { not: "ENDED" }
                }
            });

            if (existing) {
                const updated = await prisma.teachingAssignment.update({
                    where: { id: existing.id },
                    data: {
                        periodsPerWeek: derivedPeriods,
                        status: assignmentStatus
                    },
                    include: {
                        teacher: true,
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true
                    }
                });
                createdAssignments.push(updated);
                continue;
            }

            const assignment = await prisma.teachingAssignment.create({
                data: {
                    teacherId: data.teacherId,
                    academicYearId: data.academicYearId,
                    subjectId: data.subjectId,
                    schoolGradeId: data.schoolGradeId,
                    sectionId: secId,
                    periodsPerWeek: derivedPeriods,
                    status: assignmentStatus,
                    proposedById: data.userId || null
                },
                include: {
                    teacher: true,
                    subject: true,
                    schoolGrade: { include: { grade: true } },
                    section: true
                }
            });

            createdAssignments.push(assignment);
        }

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHING_ASSIGNMENTS_PROPOSED",
                resource: "TeachingAssignment",
                resourceId: data.teacherId,
                newValue: { count: createdAssignments.length, status: assignmentStatus },
                userId: data.userId || null
            }
        });

        return createdAssignments.length === 1 ? createdAssignments[0] : createdAssignments;
    }

    static async getAssignments(organizationId: string, academicYearId?: string, status?: string) {
        return prisma.teachingAssignment.findMany({
            where: {
                teacher: { organizationId },
                ...(academicYearId ? { academicYearId: String(academicYearId) } : {}),
                ...(status ? { status: status as any } : {})
            },
            include: {
                teacher: true,
                subject: true,
                schoolGrade: { include: { grade: true } },
                section: true,
                academicYear: true
            },
            orderBy: { createdAt: "desc" }
        });
    }

    /**
     * Propose assignment (Vice Principal)
     */
    static async proposeAssignment(id: string, organizationId: string, userId?: string) {
        const assignment = await prisma.teachingAssignment.findFirst({
            where: { id, teacher: { organizationId } }
        });
        if (!assignment) throw new Error("Teaching assignment not found");

        return prisma.teachingAssignment.update({
            where: { id },
            data: {
                status: "PROPOSED",
                proposedById: userId || null
            }
        });
    }

    /**
     * Approve assignment (Principal)
     */
    static async approveAssignment(id: string, organizationId: string, userId?: string) {
        const assignment = await prisma.teachingAssignment.findFirst({
            where: { id, teacher: { organizationId } }
        });
        if (!assignment) throw new Error("Teaching assignment not found");

        const updated = await prisma.teachingAssignment.update({
            where: { id },
            data: {
                status: "ACTIVE", // Moves to operational active state
                approvedById: userId || null,
                approvedAt: new Date()
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHING_ASSIGNMENT_APPROVED",
                resource: "TeachingAssignment",
                resourceId: id,
                newValue: { status: "ACTIVE" },
                userId: userId || null
            }
        });

        return updated;
    }

    /**
     * Reject assignment proposal with reasons (Principal)
     */
    static async rejectAssignment(id: string, organizationId: string, rejectionReason: string, userId?: string) {
        const assignment = await prisma.teachingAssignment.findFirst({
            where: { id, teacher: { organizationId } }
        });
        if (!assignment) throw new Error("Teaching assignment not found");

        return prisma.teachingAssignment.update({
            where: { id },
            data: {
                status: "REJECTED",
                rejectionReason
            }
        });
    }

    /**
     * End teaching assignment safely without deleting historical student assessments
     */
    static async endAssignment(id: string, organizationId: string, userId?: string) {
        const existing = await prisma.teachingAssignment.findFirst({
            where: { id, teacher: { organizationId } }
        });
        if (!existing) throw new Error("Teaching assignment not found");

        const updated = await prisma.teachingAssignment.update({
            where: { id },
            data: {
                status: "ENDED",
                effectiveEndDate: new Date()
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHING_ASSIGNMENT_ENDED",
                resource: "TeachingAssignment",
                resourceId: id,
                oldValue: { status: existing.status },
                newValue: { status: "ENDED" },
                userId: userId || null
            }
        });

        return updated;
    }

    static async updateAssignment(id: string, organizationId: string, data: {
        subjectId?: string;
        schoolGradeId?: string;
        sectionId?: string;
        periodsPerWeek?: number;
        status?: "DRAFT" | "PROPOSED" | "APPROVED" | "ACTIVE" | "ENDED";
        userId?: string;
    }) {
        const existing = await prisma.teachingAssignment.findFirst({
            where: { id, teacher: { organizationId } }
        });
        if (!existing) throw new Error("Teaching assignment not found");

        const assignment = await prisma.teachingAssignment.update({
            where: { id },
            data: {
                ...(data.subjectId && { subjectId: data.subjectId }),
                ...(data.schoolGradeId && { schoolGradeId: data.schoolGradeId }),
                ...(data.sectionId !== undefined && { sectionId: data.sectionId || null }),
                ...(data.periodsPerWeek !== undefined && { periodsPerWeek: Number(data.periodsPerWeek) }),
                ...(data.status && { status: data.status as any })
            },
            include: {
                subject: true,
                schoolGrade: { include: { grade: true } },
                section: true
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHING_ASSIGNMENT_UPDATED",
                resource: "TeachingAssignment",
                resourceId: assignment.id,
                newValue: JSON.parse(JSON.stringify(assignment)),
                userId: data.userId || null
            }
        });

        return assignment;
    }

    /**
     * Delete assignment only if it's in DRAFT/REJECTED state; otherwise end it safely
     */
    static async deleteAssignment(id: string, organizationId: string, userId?: string) {
        const existing = await prisma.teachingAssignment.findFirst({
            where: { id, teacher: { organizationId } },
            include: {
                assessments: true,
                timetables: true
            }
        });
        if (!existing) throw new Error("Teaching assignment not found");

        if (existing.assessments.length > 0 || existing.timetables.length > 0) {
            // Cannot delete because downstream records exist; end it safely instead
            return this.endAssignment(id, organizationId, userId);
        }

        await prisma.teachingAssignment.delete({ where: { id } });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHING_ASSIGNMENT_DELETED",
                resource: "TeachingAssignment",
                resourceId: id,
                oldValue: JSON.parse(JSON.stringify(existing)),
                userId: userId || null
            }
        });
    }

    // ==========================================
    // TEACHER SPECIALIZATION MANAGEMENT
    // ==========================================
    static async getTeacherSpecializations(teacherId: string, organizationId: string) {
        const teacher = await prisma.teacher.findFirst({
            where: { id: teacherId, organizationId }
        });
        if (!teacher) throw new Error("Teacher not found");

        return prisma.teacherSpecialization.findMany({
            where: { teacherId },
            include: { subject: true }
        });
    }

    static async addTeacherSpecialization(teacherId: string, organizationId: string, data: {
        subjectId: string;
        cycle?: "PRIMARY_FIRST_CYCLE" | "PRIMARY_SECOND_CYCLE" | "SECONDARY_FIRST_CYCLE" | "SECONDARY_SECOND_CYCLE";
        isPrimary?: boolean;
        verified?: boolean;
        notes?: string;
    }) {
        const teacher = await prisma.teacher.findFirst({
            where: { id: teacherId, organizationId }
        });
        if (!teacher) throw new Error("Teacher not found");

        const subject = await prisma.subject.findFirst({
            where: { id: data.subjectId, organizationId }
        });
        if (!subject) throw new Error("Subject not found");

        return prisma.teacherSpecialization.upsert({
            where: {
                teacherId_subjectId: { teacherId, subjectId: data.subjectId }
            },
            update: {
                cycle: data.cycle || null,
                isPrimary: data.isPrimary ?? true,
                verified: data.verified ?? false,
                notes: data.notes || null
            },
            create: {
                teacherId,
                subjectId: data.subjectId,
                cycle: data.cycle || null,
                isPrimary: data.isPrimary ?? true,
                verified: data.verified ?? false,
                notes: data.notes || null
            },
            include: { subject: true }
        });
    }

    static async removeTeacherSpecialization(teacherId: string, subjectId: string, organizationId: string) {
        const teacher = await prisma.teacher.findFirst({
            where: { id: teacherId, organizationId }
        });
        if (!teacher) throw new Error("Teacher not found");

        return prisma.teacherSpecialization.delete({
            where: {
                teacherId_subjectId: { teacherId, subjectId }
            }
        });
    }

    static async getTeacherByUserId(userId: string, organizationId: string) {
        return prisma.teacher.findFirst({
            where: { userId, organizationId },
            include: {
                assignments: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: {
                            include: {
                                studentEnrollments: {
                                    include: {
                                        student: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    static async getMyClasses(userId: string, organizationId: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) return [];

        const assignments = await prisma.teachingAssignment.findMany({
            where: { teacherId: teacher.id },
            include: {
                subject: true,
                schoolGrade: { include: { grade: true } },
                section: {
                    include: {
                        studentEnrollments: {
                            include: {
                                student: true
                            }
                        }
                    }
                }
            }
        });

        return assignments.map((a: any) => ({
            assignment: a,
            students: a.section?.studentEnrollments || []
        }));
    }

    static async getMyTimetable(userId: string, organizationId: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) return [];

        return prisma.timetable.findMany({
            where: {
                organizationId,
                teachingAssignment: {
                    teacherId: teacher.id
                }
            },
            include: {
                teachingAssignment: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true
                    }
                },
                classPeriod: true
            },
            orderBy: [
                { dayOfWeek: "asc" }
            ]
        });
    }

    static async getMyStudents(userId: string, organizationId: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) return [];

        const sectionIds = teacher.assignments
            .map((a: any) => a.sectionId)
            .filter((id: any): id is string => Boolean(id));

        if (sectionIds.length === 0) return [];

        return prisma.studentEnrollment.findMany({
            where: {
                organizationId,
                sectionId: { in: sectionIds },
                status: "ACTIVE"
            },
            include: {
                student: true,
                section: true,
                schoolGrade: { include: { grade: true } },
                attendances: {
                    take: 10,
                    orderBy: { date: "desc" }
                },
                results: {
                    take: 5,
                    include: { assessment: true },
                    orderBy: { createdAt: "desc" }
                }
            }
        });
    }

    static async getDashboardSummary(userId: string, organizationId: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        const currentDayOfWeek = today.getDay();

        const todayTimetable = teacher ? await prisma.timetable.findMany({
            where: {
                organizationId,
                teachingAssignment: { teacherId: teacher.id },
                dayOfWeek: currentDayOfWeek
            },
            include: {
                teachingAssignment: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: {
                            include: {
                                studentEnrollments: {
                                    where: { status: "ACTIVE" }
                                }
                            }
                        }
                    }
                },
                classPeriod: true
            },
            orderBy: { classPeriod: { startTime: "asc" } }
        }) : [];

        // Check attendance records for today to determine class completion status
        let attendancePendingCount = 0;
        const todayClasses = await Promise.all(todayTimetable.map(async (t: any, index: number) => {
            const hasRecordedAttendance = await prisma.studentAttendance.findFirst({
                where: {
                    organizationId,
                    classPeriodId: t.classPeriodId,
                    date: { gte: startOfToday, lte: endOfToday }
                }
            });

            if (!hasRecordedAttendance) {
                attendancePendingCount++;
            }

            return {
                id: t.id,
                period: index + 1,
                time: `${t.classPeriod.startTime} - ${t.classPeriod.endTime}`,
                subject: t.teachingAssignment.subject.name,
                section: `Grade ${t.teachingAssignment.schoolGrade.grade.level}${t.teachingAssignment.section?.name || ''}`,
                room: t.roomId || "Assigned Classroom",
                studentCount: t.teachingAssignment.section?.studentEnrollments.length || 0,
                status: hasRecordedAttendance ? "Completed" : "Start Class",
                action: hasRecordedAttendance ? "Completed" : "Start Class",
                sectionId: t.teachingAssignment.sectionId,
                classPeriodId: t.classPeriodId,
                teachingAssignmentId: t.teachingAssignmentId
            };
        }));

        const sectionIds = teacher ? teacher.assignments
            .map((a: any) => a.sectionId)
            .filter((id: any): id is string => Boolean(id)) : [];

        const totalStudents = sectionIds.length > 0 ? await prisma.studentEnrollment.count({
            where: {
                organizationId,
                sectionId: { in: sectionIds },
                status: "ACTIVE"
            }
        }) : 0;

        const assignmentIds = teacher ? teacher.assignments.map((a: any) => a.id) : [];
        const pendingAssessmentsCount = assignmentIds.length > 0 ? await prisma.assessment.count({
            where: {
                organizationId,
                teachingAssignmentId: { in: assignmentIds }
            }
        }) : 0;

        const pendingSubmissionsCount = assignmentIds.length > 0 ? await prisma.submission.count({
            where: {
                activity: {
                    organizationId,
                    teachingAssignmentId: { in: assignmentIds }
                },
                status: "SUBMITTED"
            }
        }) : 0;

        const upcomingActivitiesCount = assignmentIds.length > 0 ? await prisma.learningActivity.count({
            where: {
                organizationId,
                teachingAssignmentId: { in: assignmentIds },
                dueDate: { gte: startOfToday }
            }
        }) : 0;

        const supportFlags = sectionIds.length > 0 ? await prisma.supportFlag.findMany({
            where: {
                organizationId,
                enrollment: { sectionId: { in: sectionIds } },
                resolvedAt: null
            },
            include: {
                enrollment: {
                    include: {
                        student: true,
                        section: true,
                        schoolGrade: { include: { grade: true } }
                    }
                }
            },
            take: 10
        }) : [];

        const studentsRequiringAttention = supportFlags.map((sf: any) => ({
            id: sf.id,
            studentName: `${sf.enrollment.student.firstName} ${sf.enrollment.student.lastName}`,
            section: `Grade ${sf.enrollment.schoolGrade.grade.level}${sf.enrollment.section?.name || ''}`,
            reason: sf.description,
            type: sf.type === "ACADEMIC" ? "Low Performance" : sf.type === "ATTENDANCE" ? "Frequent Absence" : "Behavioral / Support Need",
            detail: sf.type === "ACADEMIC" ? "Academic Flag" : sf.type === "ATTENDANCE" ? "Attendance Flag" : "Support Flag"
        }));

        // Calculate class performance overview dynamically from StudentResult
        const classPerformanceOverview = await Promise.all(
            (teacher?.assignments || []).map(async (assignment: any) => {
                const results = await prisma.studentResult.findMany({
                    where: {
                        assessment: {
                            teachingAssignmentId: assignment.id
                        }
                    },
                    select: { score: true }
                });

                const totalScore = results.reduce((acc: number, curr: any) => acc + curr.score, 0);
                const averageScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;
                const className = `Grade ${assignment.schoolGrade.grade.level}${assignment.section?.name || ''} ${assignment.subject.name}`;

                return {
                    className,
                    averageScore,
                    teachingAssignmentId: assignment.id
                };
            })
        );

        const teacherDisplayName = teacher ? `Mr. ${teacher.lastName || teacher.firstName}` : "Teacher";

        const recommendations: string[] = [];
        if (studentsRequiringAttention.length > 0) {
            recommendations.push(`${studentsRequiringAttention.length} student(s) currently require academic or support attention.`);
        }
        if (pendingSubmissionsCount > 0) {
            recommendations.push(`You have ${pendingSubmissionsCount} pending student submission(s) awaiting review and feedback.`);
        }
        if (attendancePendingCount > 0) {
            recommendations.push(`${attendancePendingCount} class period(s) today require attendance submission.`);
        }
        if (recommendations.length === 0) {
            recommendations.push("All current teaching tasks and student attendance logs are up to date!");
        }

        const priorities: string[] = [];
        if (attendancePendingCount > 0) priorities.push("Complete today's class attendance logs");
        if (pendingSubmissionsCount > 0) priorities.push(`Grade ${pendingSubmissionsCount} pending assignment submissions`);
        if (studentsRequiringAttention.length > 0) priorities.push(`Review ${studentsRequiringAttention.length} active student support flags`);
        if (priorities.length === 0) priorities.push("Prepare upcoming lesson materials and assessments");

        return {
            profile: teacher,
            todayClasses,
            todayClassesCount: todayClasses.length,
            totalStudents,
            attendancePendingCount,
            pendingAssessmentsCount,
            pendingSubmissionsCount,
            studentsNeedAttentionCount: studentsRequiringAttention.length,
            upcomingActivitiesCount,
            classPerformanceOverview,
            tasksOverview: {
                attendancePending: attendancePendingCount,
                pendingAssessments: pendingAssessmentsCount,
                pendingAssignments: pendingSubmissionsCount,
                studentsNeedAttention: studentsRequiringAttention.length,
                upcomingActivities: upcomingActivitiesCount
            },
            studentsRequiringAttention,
            aiTeachingInsights: {
                greeting: `Good day, ${teacherDisplayName}! Here are your daily operational teaching insights.`,
                recommendations,
                priorities
            }
        };
    }

    // Subdomain 3: Detailed Student Profile
    static async getStudentDetail(userId: string, organizationId: string, studentId: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        const sectionIds = teacher.assignments
            .map((a: any) => a.sectionId)
            .filter((id: any): id is string => Boolean(id));

        const enrollment = await prisma.studentEnrollment.findFirst({
            where: {
                organizationId,
                studentId,
                sectionId: { in: sectionIds }
            },
            include: {
                student: {
                    include: {
                        parents: {
                            include: { parent: true }
                        }
                    }
                },
                section: true,
                schoolGrade: { include: { grade: true } },
                attendances: {
                    take: 20,
                    orderBy: { date: "desc" },
                    include: { classPeriod: true }
                },
                results: {
                    take: 10,
                    include: { assessment: true },
                    orderBy: { createdAt: "desc" }
                },
                supportFlags: {
                    orderBy: { createdAt: "desc" }
                },
                submissions: {
                    take: 10,
                    include: { activity: true },
                    orderBy: { createdAt: "desc" }
                }
            }
        });

        if (!enrollment) throw new Error("Student enrollment not found in your assigned classes");
        return enrollment;
    }

    static async getMyProfile(userId: string, organizationId: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");
        return teacher;
    }

    static async updateMyProfile(userId: string, organizationId: string, data: { phone?: string; address?: string; specialization?: string; bio?: string }) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        return prisma.teacher.update({
            where: { id: teacher.id },
            data: {
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.address !== undefined && { address: data.address }),
                ...(data.specialization !== undefined && { specialization: data.specialization }),
                ...(data.bio !== undefined && { bio: data.bio }),
            }
        });
    }

    // Subdomain 4: Batch Section Attendance
    static async recordBatchAttendance(userId: string, organizationId: string, data: {
        academicYearId: string;
        sectionId: string;
        classPeriodId?: string;
        date: string;
        attendances: Array<{ enrollmentId: string; status: AttendanceStatus; remarks?: string }>;
    }) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        let activeYearId = data.academicYearId;
        if (!activeYearId || activeYearId === "active-year") {
            const activeYear = await prisma.academicYear.findFirst({
                where: { organizationId, status: "ACTIVE" }
            }) || await prisma.academicYear.findFirst({ where: { organizationId } });
            if (activeYear) activeYearId = activeYear.id;
        }

        const targetDate = new Date(data.date);

        const results = [];
        for (const item of data.attendances) {
            const existing = await prisma.studentAttendance.findFirst({
                where: {
                    enrollmentId: item.enrollmentId,
                    date: targetDate,
                    classPeriodId: data.classPeriodId || null
                }
            });

            if (existing) {
                const updated = await prisma.studentAttendance.update({
                    where: { id: existing.id },
                    data: {
                        status: item.status,
                        remarks: item.remarks,
                        recordedById: userId
                    }
                });
                results.push(updated);
            } else {
                const created = await prisma.studentAttendance.create({
                    data: {
                        organizationId,
                        academicYearId: activeYearId,
                        enrollmentId: item.enrollmentId,
                        classPeriodId: data.classPeriodId || null,
                        date: targetDate,
                        status: item.status,
                        remarks: item.remarks,
                        recordedById: userId
                    }
                });
                results.push(created);
            }
        }

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHER_BATCH_ATTENDANCE_RECORDED",
                resource: "StudentAttendance",
                resourceId: data.sectionId,
                newValue: { date: data.date, count: results.length },
                userId
            }
        });

        return results;
    }

    static async getRepeatedAbsences(userId: string, organizationId: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) return [];

        const sectionIds = teacher.assignments
            .map((a: any) => a.sectionId)
            .filter((id: any): id is string => Boolean(id));

        if (sectionIds.length === 0) return [];

        const activeEnrollments = await prisma.studentEnrollment.findMany({
            where: {
                organizationId,
                sectionId: { in: sectionIds },
                status: "ACTIVE"
            },
            include: {
                student: true,
                section: true,
                schoolGrade: { include: { grade: true } },
                attendances: {
                    where: { status: { in: ["ABSENT", "LATE"] } },
                    orderBy: { date: "desc" }
                }
            }
        });

        const flagged = activeEnrollments
            .map((e: any) => {
                const absentCount = e.attendances.filter((a: any) => a.status === "ABSENT").length;
                const lateCount = e.attendances.filter((a: any) => a.status === "LATE").length;
                return {
                    enrollmentId: e.id,
                    student: e.student,
                    section: e.section?.name || "A",
                    grade: e.schoolGrade?.grade?.level || "9",
                    absentCount,
                    lateCount,
                    totalFlags: absentCount + lateCount,
                    lastAbsence: e.attendances[0]?.date || null
                };
            })
            .filter((e: any) => e.totalFlags >= 2)
            .sort((a: any, b: any) => b.totalFlags - a.totalFlags);

        return flagged;
    }

    static async getAttendanceHistory(userId: string, organizationId: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) return [];

        const sectionIds = teacher.assignments
            .map((a: any) => a.sectionId)
            .filter((id: any): id is string => Boolean(id));

        if (sectionIds.length === 0) return [];

        const logs = await prisma.studentAttendance.findMany({
            where: {
                organizationId,
                enrollment: {
                    sectionId: { in: sectionIds }
                }
            },
            include: {
                enrollment: {
                    include: {
                        student: true,
                        section: true,
                        schoolGrade: { include: { grade: true } }
                    }
                },
                classPeriod: true
            },
            orderBy: { date: "desc" },
            take: 100
        });

        return logs;
    }

    static async getCurriculumData(userId: string, organizationId: string, assignmentId?: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) {
            return {
                subject: null,
                overallProgressPercent: 0,
                unitsCompletedCount: 0,
                totalUnitsCount: 0,
                topicsCompletedCount: 0,
                totalTopicsCount: 0,
                totalPlannedHours: 0,
                totalDeliveredHours: 0,
                units: []
            };
        }

        let assignment: any = null;
        if (assignmentId) {
            assignment = await prisma.teachingAssignment.findFirst({
                where: { id: assignmentId, teacherId: teacher.id },
                include: {
                    subject: true,
                    schoolGrade: { include: { grade: true } },
                    section: true,
                    academicYear: true
                }
            });
        }

        if (!assignment) {
            return {
                assignment: null,
                subject: null,
                overallProgressPercent: 0,
                unitsCompletedCount: 0,
                totalUnitsCount: 0,
                topicsCompletedCount: 0,
                totalTopicsCount: 0,
                totalPlannedHours: 0,
                totalDeliveredHours: 0,
                units: []
            };
        }

        const subjectName = assignment.subject?.name || "";
        const gradeName = assignment.schoolGrade?.grade?.name || "";
        const sectionName = assignment.section?.name || "";
        const academicYearName = assignment.academicYear?.name || "";

        let weeklyPeriods = assignment.periodsPerWeek || 0;
        if (!weeklyPeriods && assignment.schoolGradeId && assignment.subjectId) {
            const gradeSubject = await prisma.schoolGradeSubject.findFirst({
                where: { schoolGradeId: assignment.schoolGradeId, subjectId: assignment.subjectId }
            });
            if (gradeSubject?.weeklyPeriods) {
                weeklyPeriods = gradeSubject.weeklyPeriods;
            }
        }

        // Query real recorded topic coverage and lesson logs for this assignment
        const recordedCoverages = await prisma.topicCoverage.findMany({
            where: {
                teachingAssignmentId: assignment.id,
                organizationId
            },
            orderBy: [{ unitNumber: "asc" }, { createdAt: "asc" }]
        });

        const recordedLogs = await prisma.lessonProgressLog.findMany({
            where: {
                teachingAssignmentId: assignment.id,
                organizationId
            },
            orderBy: { lessonDate: "desc" },
            take: 50
        });

        // Dynamic curriculum data: empty until uploaded or configured in the database
        const subjectCompetencies: string[] = [];
        const units: any[] = [];

        // If units array is empty but the teacher has recorded topic coverages, group them into units
        if (units.length === 0 && recordedCoverages.length > 0) {
            const unitMap = new Map<number, any>();
            for (const cov of recordedCoverages) {
                if (!unitMap.has(cov.unitNumber)) {
                    unitMap.set(cov.unitNumber, {
                        unitNumber: cov.unitNumber,
                        title: cov.unitTitle || `Unit ${cov.unitNumber}`,
                        plannedHours: 0,
                        actualHours: 0,
                        status: "PENDING",
                        topics: []
                    });
                }
                const u = unitMap.get(cov.unitNumber)!;
                u.topics.push({
                    title: cov.topicTitle,
                    topicNumber: cov.topicNumber || `${cov.unitNumber}.${u.topics.length + 1}`,
                    status: cov.status,
                    completedAt: cov.completedAt,
                    delayReason: cov.delayReason,
                    notes: cov.notes,
                    plannedHours: 0
                });
            }
            units.push(...Array.from(unitMap.values()));
        } else if (units.length > 0) {
            // Merge recorded coverage into syllabus units
            for (const u of units) {
                for (const t of u.topics || []) {
                    const match = recordedCoverages.find(c => 
                        c.unitNumber === u.unitNumber && 
                        (c.topicTitle.toLowerCase() === (t.title || "").toLowerCase() || c.topicNumber === t.topicNumber)
                    );
                    if (match) {
                        t.status = match.status;
                        t.completedAt = match.completedAt;
                        t.delayReason = match.delayReason;
                        t.notes = match.notes;
                    }
                }
            }
        }

        // Compute unit completion statuses
        for (const u of units) {
            const topics = u.topics || [];
            const compCount = topics.filter((t: any) => t.status === "COMPLETED").length;
            u.completedTopicsCount = compCount;
            if (topics.length > 0) {
                if (compCount === topics.length) {
                    u.status = "COMPLETED";
                } else if (compCount > 0 || topics.some((t: any) => t.status === "IN_PROGRESS")) {
                    u.status = "IN_PROGRESS";
                } else {
                    u.status = "PENDING";
                }
            }
        }

        // Aggregate statistics
        const totalUnitsCount = units.length;
        const unitsCompletedCount = units.filter(u => u.status === "COMPLETED").length;
        const totalTopicsCount = units.reduce((acc, u) => acc + (u.topics?.length || 0), 0);
        const topicsCompletedCount = units.reduce((acc, u) => acc + (u.completedTopicsCount || 0), 0);
        const totalPlannedHours = units.reduce((acc, u) => acc + (u.plannedHours || 0), 0);
        const totalDeliveredHours = recordedLogs.length;
        const overallProgressPercent = totalTopicsCount > 0 ? Math.round((topicsCompletedCount / totalTopicsCount) * 100) : 0;

        return {
            assignment: assignment ? {
                id: assignment.id,
                subjectId: assignment.subjectId,
                subjectName,
                gradeName,
                sectionName,
                academicYearName,
                weeklyPeriods
            } : null,
            subject: {
                name: subjectName,
                gradeLevel: gradeName,
                section: sectionName,
                academicYear: academicYearName,
                weeklyPeriods,
                generalCompetencies: subjectCompetencies
            },
            overallProgressPercent,
            unitsCompletedCount,
            totalUnitsCount,
            topicsCompletedCount,
            totalTopicsCount,
            totalPlannedHours,
            totalDeliveredHours,
            units,
            coverages: recordedCoverages,
            lessonLogs: recordedLogs
        };
    }

    // Subdomain: Record Topic Coverage (SRS 4.4.8)
    static async recordTopicCoverage(userId: string, organizationId: string, data: {
        assignmentId: string;
        unitNumber: number;
        unitTitle?: string;
        topicNumber?: string;
        topicTitle: string;
        status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
        completionDate?: string;
        delayReason?: string;
        notes?: string;
    }) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        const assignment = await prisma.teachingAssignment.findFirst({
            where: { id: data.assignmentId, teacherId: teacher.id }
        });
        if (!assignment) throw new Error("Teaching assignment not found or unassigned");

        if (!data.topicTitle) throw new Error("Topic title is required");

        const completedAt = data.status === "COMPLETED" 
            ? (data.completionDate ? new Date(data.completionDate) : new Date())
            : null;

        const coverage = await prisma.topicCoverage.upsert({
            where: {
                teachingAssignmentId_unitNumber_topicTitle: {
                    teachingAssignmentId: data.assignmentId,
                    unitNumber: Number(data.unitNumber) || 1,
                    topicTitle: data.topicTitle.trim()
                }
            },
            update: {
                status: data.status,
                completedAt,
                delayReason: data.delayReason || null,
                notes: data.notes || null,
                unitTitle: data.unitTitle,
                topicNumber: data.topicNumber
            },
            create: {
                organizationId,
                teachingAssignmentId: data.assignmentId,
                unitNumber: Number(data.unitNumber) || 1,
                unitTitle: data.unitTitle,
                topicNumber: data.topicNumber,
                topicTitle: data.topicTitle.trim(),
                status: data.status,
                completedAt,
                delayReason: data.delayReason || null,
                notes: data.notes || null
            }
        });

        return coverage;
    }

    // Subdomain: Record Lesson Progress Log (SRS 4.4.7)
    static async recordLessonLog(userId: string, organizationId: string, data: {
        assignmentId: string;
        unitNumber?: number;
        topicTitle: string;
        lessonDate: string;
        periodNumber?: number;
        studentsAttending?: number;
        status?: "COMPLETED" | "PARTIALLY_COMPLETED" | "INTERRUPTED" | "CANCELLED";
        interruptionReason?: string;
        teachingNotes?: string;
        learningDifficulties?: string;
        observations?: string;
    }) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        const assignment = await prisma.teachingAssignment.findFirst({
            where: { id: data.assignmentId, teacherId: teacher.id }
        });
        if (!assignment) throw new Error("Teaching assignment not found or unassigned");

        if (!data.topicTitle) throw new Error("Topic title is required");
        if (!data.lessonDate) throw new Error("Lesson date is required");

        const log = await prisma.lessonProgressLog.create({
            data: {
                organizationId,
                teachingAssignmentId: data.assignmentId,
                unitNumber: data.unitNumber ? Number(data.unitNumber) : null,
                topicTitle: data.topicTitle.trim(),
                lessonDate: new Date(data.lessonDate),
                periodNumber: data.periodNumber ? Number(data.periodNumber) : null,
                studentsAttending: Number(data.studentsAttending) || 0,
                status: data.status || "COMPLETED",
                interruptionReason: data.interruptionReason || null,
                teachingNotes: data.teachingNotes || null,
                learningDifficulties: data.learningDifficulties || null,
                observations: data.observations || null
            }
        });

        // If completed, automatically reflect in topic coverage
        if (data.status === "COMPLETED" || !data.status) {
            await prisma.topicCoverage.upsert({
                where: {
                    teachingAssignmentId_unitNumber_topicTitle: {
                        teachingAssignmentId: data.assignmentId,
                        unitNumber: data.unitNumber ? Number(data.unitNumber) : 1,
                        topicTitle: data.topicTitle.trim()
                    }
                },
                update: {
                    status: "COMPLETED",
                    completedAt: new Date(data.lessonDate),
                    notes: data.teachingNotes || undefined
                },
                create: {
                    organizationId,
                    teachingAssignmentId: data.assignmentId,
                    unitNumber: data.unitNumber ? Number(data.unitNumber) : 1,
                    topicTitle: data.topicTitle.trim(),
                    status: "COMPLETED",
                    completedAt: new Date(data.lessonDate),
                    notes: data.teachingNotes || null
                }
            });
        }

        return log;
    }

    // Subdomain 6: Create Assessment & Batch Results
    static async createAssessmentWithResults(userId: string, organizationId: string, data: {
        title: string;
        type?: string;
        maxScore: number;
        passingScore?: number;
        dueDate?: string;
        teachingAssignmentId: string;
        results?: Array<{ enrollmentId: string; score: number; feedback?: string }>;
    }) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        const assignment = await prisma.teachingAssignment.findFirst({
            where: { id: data.teachingAssignmentId, teacherId: teacher.id }
        });
        if (!assignment) throw new Error("Teaching assignment not found or unassigned");

        const assessmentType = data.type?.toUpperCase() || "QUIZ";

        const assessment = await prisma.assessment.create({
            data: {
                organizationId,
                academicYearId: assignment.academicYearId,
                teachingAssignmentId: data.teachingAssignmentId,
                title: data.title,
                type: assessmentType as any,
                maxScore: data.maxScore,
                passingScore: data.passingScore || (data.maxScore * 0.5),
                dueDate: data.dueDate ? new Date(data.dueDate) : null
            }
        });

        if (data.results && data.results.length > 0) {
            for (const r of data.results) {
                await prisma.studentResult.upsert({
                    where: {
                        assessmentId_enrollmentId: {
                            assessmentId: assessment.id,
                            enrollmentId: r.enrollmentId
                        }
                    },
                    update: {
                        score: r.score,
                        feedback: r.feedback,
                        gradedById: userId
                    },
                    create: {
                        assessmentId: assessment.id,
                        enrollmentId: r.enrollmentId,
                        score: r.score,
                        feedback: r.feedback,
                        gradedById: userId
                    }
                });
            }
        }

        return prisma.assessment.findUnique({
            where: { id: assessment.id },
            include: { results: { include: { enrollment: { include: { student: true } } } } }
        });
    }

    // Subdomain 7: Grade Submission
    static async gradeActivitySubmission(userId: string, organizationId: string, submissionId: string, data: {
        status?: SubmissionStatus;
        grade?: string;
        feedback?: string;
    }) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        const submission = await prisma.submission.findFirst({
            where: {
                id: submissionId,
                activity: { organizationId }
            }
        });

        if (!submission) throw new Error("Activity submission not found");

        return prisma.submission.update({
            where: { id: submissionId },
            data: {
                status: data.status || SubmissionStatus.GRADED,
                grade: data.grade,
                feedback: data.feedback
            }
        });
    }

    // Subdomain 8: Create Support Flag / Intervention
    static async createStudentSupportFlag(userId: string, organizationId: string, data: {
        enrollmentId: string;
        type: SupportFlagType;
        description: string;
    }) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        const flag = await prisma.supportFlag.create({
            data: {
                organizationId,
                enrollmentId: data.enrollmentId,
                type: data.type,
                description: data.description,
                raisedById: userId
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHER_SUPPORT_FLAG_RAISED",
                resource: "SupportFlag",
                resourceId: flag.id,
                newValue: JSON.parse(JSON.stringify(flag)),
                userId
            }
        });

        return flag;
    }

    static async resolveSupportFlag(userId: string, organizationId: string, flagId: string, data: { resolution: string }) {
        const flag = await prisma.supportFlag.findFirst({
            where: { id: flagId, organizationId }
        });
        if (!flag) throw new Error("Support flag not found");

        return prisma.supportFlag.update({
            where: { id: flagId },
            data: {
                resolvedAt: new Date(),
                resolution: data.resolution
            }
        });
    }

    // Subdomain 9: Send Parent Message
    // NOTE: The controller now delegates to CommunicationService.sendTeacherParentMessage for validated messaging.
    // This legacy method is preserved for type-safety but should not be called from controllers.
    static async sendParentMessage(userId: string, organizationId: string, data: { parentUserId: string; content: string }) {
        const message = await prisma.message.create({
            data: {
                organizationId,
                senderId: userId,
                receiverId: data.parentUserId,
                content: data.content,
                isRead: false
            }
        });

        return message;
    }

    // Subdomain 12: Class Performance Report
    static async getClassPerformanceReport(userId: string, organizationId: string, teachingAssignmentId: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        const assignment = await prisma.teachingAssignment.findFirst({
            where: { id: teachingAssignmentId, teacherId: teacher.id },
            include: {
                subject: true,
                schoolGrade: { include: { grade: true } },
                section: {
                    include: {
                        studentEnrollments: {
                            where: { status: "ACTIVE" },
                            include: {
                                student: true,
                                results: { where: { assessment: { teachingAssignmentId } } },
                                attendances: { take: 30 }
                            }
                        }
                    }
                }
            }
        });

        if (!assignment) throw new Error("Teaching assignment not found");

        const students = assignment.section?.studentEnrollments || [];
        const totalStudents = students.length;

        let totalScores = 0;
        let totalCount = 0;

        students.forEach((s: any) => {
            s.results.forEach((r: any) => {
                totalScores += r.score;
                totalCount += 1;
            });
        });

        const classAverage = totalCount > 0 ? Number((totalScores / totalCount).toFixed(1)) : 0;

        return {
            assignmentId: assignment.id,
            subject: assignment.subject.name,
            grade: `Grade ${assignment.schoolGrade.grade.level}`,
            section: assignment.section?.name || "General",
            totalStudents,
            classAverage,
            totalAssessmentsRecorded: totalCount
        };
    }

    // Subdomain 13: AI Teacher Assistant Insight
    static async generateAiTeachingAssistantInsight(userId: string, organizationId: string, prompt: string, type?: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        let category = type?.toUpperCase() || "LESSON_PLANNING";
        let recommendation = "";

        if (category === "LESSON_PLANNING") {
            recommendation = `AI Lesson Plan Suggestion for "${prompt}": Break the session into 10min Hook, 25min Concept Demonstration, 15min Guided Group Practice, and 10min Formative Exit Ticket.`;
        } else if (category === "QUESTION_GENERATION") {
            recommendation = `Generated 3 Practice Questions for "${prompt}":\n1. Concept Recall (Easy)\n2. Analytical Problem Solving (Medium)\n3. Real-world Application Scenario (Advanced).`;
        } else {
            recommendation = `AI Performance Insight: Focus additional group practice on fundamental concepts related to "${prompt}". Recommend assigning a targeted practice worksheet.`;
        }

        return {
            prompt,
            category,
            recommendation,
            disclaimer: "AI recommendations are advisory-only. Human teacher review is required before educational implementation."
        };
    }

    static async reportIssue(userId: string, organizationId: string, data: { title: string; category?: string; description?: string; priority?: string }) {
        let parsedPriority: IssuePriority = IssuePriority.MEDIUM;
        if (data.priority) {
            const uppercasePriority = data.priority.toUpperCase();
            if (Object.values(IssuePriority).includes(uppercasePriority as IssuePriority)) {
                parsedPriority = uppercasePriority as IssuePriority;
            }
        }

        const issue = await prisma.issue.create({
            data: {
                organizationId,
                reportedById: userId,
                title: data.title,
                description: data.description || data.title,
                priority: parsedPriority,
                status: "OPEN"
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHER_ISSUE_REPORTED",
                resource: "Issue",
                resourceId: issue.id,
                newValue: JSON.parse(JSON.stringify(issue)),
                userId
            }
        });

        return issue;
    }

    static async getMyIssues(userId: string, organizationId: string) {
        return prisma.issue.findMany({
            where: {
                organizationId,
                reportedById: userId
            },
            orderBy: { createdAt: "desc" }
        });
    }
}
