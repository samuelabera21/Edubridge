import { prisma } from "../../infrastructure/prisma/client.js";
import { EnrollmentStatus } from "../../generated/prisma/enums.js";

export class StudentService {
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
                    }
                },
                parents: true
            }
        });
    }

    static async enrollStudent(organizationId: string, studentId: string, academicYearId: string, schoolGradeId: string, sectionId?: string) {
        // Check if there is an active/enrolled enrollment in this academic year
        const activeEnrollment = await prisma.studentEnrollment.findFirst({
            where: {
                studentId,
                academicYearId,
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
                student: true,
                schoolGrade: { include: { grade: true } },
                section: true
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
