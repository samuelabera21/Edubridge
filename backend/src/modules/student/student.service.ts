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
                        section: true,
                        organization: {
                            include: { schoolProfile: true }
                        }
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
                        organization: {
                            include: { schoolProfile: true }
                        },
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

        const [todayClasses, weeklyClasses, attendance, results, activities, notifications, supportFlags, announcements] = await Promise.all([
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
            prisma.timetable.findMany({
                where: {
                    organizationId,
                    academicYearId: enrollment.academicYearId,
                    teachingAssignment: { sectionId: enrollment.sectionId }
                },
                include: {
                    classPeriod: true,
                    teachingAssignment: {
                        include: { subject: true, teacher: true, section: true }
                    },
                    room: true
                },
                orderBy: [{ dayOfWeek: "asc" }, { classPeriod: { startTime: "asc" } }]
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
            weeklyClasses,
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

    static async getStudentAttendance(userId: string, organizationId: string, startDate?: string, endDate?: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        const enrollment = student?.enrollments[0];
        if (!student || !enrollment) return null;

        return prisma.studentAttendance.findMany({
            where: {
                organizationId,
                enrollmentId: enrollment.id,
                ...(startDate || endDate ? {
                    date: {
                        ...(startDate ? { gte: new Date(startDate) } : {}),
                        ...(endDate ? { lte: new Date(endDate) } : {})
                    }
                } : {})
            },
            include: { classPeriod: true },
            orderBy: { date: "desc" }
        });
    }

    static async getStudentAttendanceTeachers(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        const enrollment = student?.enrollments[0];
        if (!enrollment) return null;

        return prisma.teacher.findMany({
            where: {
                organizationId,
                assignments: {
                    some: {
                        academicYearId: enrollment.academicYearId,
                        schoolGradeId: enrollment.schoolGradeId,
                        sectionId: enrollment.sectionId
                    }
                }
            },
            select: { id: true, firstName: true, lastName: true },
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
        });
    }

    static async getStudentDigitalResources(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        const enrollment = student?.enrollments[0];
        if (!student || !enrollment) return null;

        return prisma.digitalResource.findMany({
            where: {
                organizationId,
                status: "PUBLISHED",
                OR: [
                    { academicYearId: null },
                    { academicYearId: enrollment.academicYearId }
                ],
                AND: [
                    {
                        OR: [
                            { gradeName: null },
                            { gradeName: enrollment.schoolGrade.grade.name },
                            { gradeName: String(enrollment.schoolGrade.grade.level) }
                        ]
                    },
                    {
                        OR: [
                            { recommendations: { some: { enrollmentId: enrollment.id } } },
                            { recommendations: { some: { academicYearId: enrollment.academicYearId, schoolGradeId: enrollment.schoolGradeId, sectionId: enrollment.sectionId } } },
                            { recommendations: { none: {} } }
                        ]
                    }
                ]
            },
            include: {
                recommendations: {
                    where: {
                        OR: [
                            { enrollmentId: enrollment.id },
                            { academicYearId: enrollment.academicYearId, schoolGradeId: enrollment.schoolGradeId, sectionId: enrollment.sectionId }
                        ]
                    },
                    select: { note: true, teacher: { select: { firstName: true, lastName: true } } }
                }
            },
            orderBy: { createdAt: "desc" }
        });
    }

    static async getStudentCommunicationTeachers(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        const enrollment = student?.enrollments[0];
        if (!student || !enrollment) return null;

        return prisma.teacher.findMany({
            where: {
                organizationId,
                assignments: {
                    some: {
                        academicYearId: enrollment.academicYearId,
                        schoolGradeId: enrollment.schoolGradeId,
                        sectionId: enrollment.sectionId
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
                        academicYearId: enrollment.academicYearId,
                        schoolGradeId: enrollment.schoolGradeId,
                        sectionId: enrollment.sectionId
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
            include: { author: { select: { name: true } } },
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

        return prisma.message.create({
            data: { senderId: userId, receiverId, content },
            include: {
                sender: { select: { id: true, name: true } },
                receiver: { select: { id: true, name: true } }
            }
        });
    }

    static async getStudentAssessments(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        const enrollment = student?.enrollments[0];
        if (!student || !enrollment) return null;

        return prisma.assessment.findMany({
            where: {
                organizationId,
                academicYearId: enrollment.academicYearId,
                teachingAssignment: {
                    schoolGradeId: enrollment.schoolGradeId,
                    sectionId: enrollment.sectionId
                }
            },
            include: {
                teachingAssignment: {
                    include: { subject: true, teacher: true, schoolGrade: { include: { grade: true } }, section: true }
                },
                results: { where: { enrollmentId: enrollment.id } }
            },
            orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
        });
    }

    static async getStudentLearningActivities(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        const enrollment = student?.enrollments[0];
        if (!student || !enrollment) return null;

        return prisma.learningActivity.findMany({
            where: {
                organizationId,
                academicYearId: enrollment.academicYearId,
                teachingAssignment: {
                    schoolGradeId: enrollment.schoolGradeId,
                    sectionId: enrollment.sectionId
                },
                OR: [
                    { supportCategory: null },
                    {
                        supportCategory: { in: ["RECOMMENDATION", "REMEDIAL", "ENRICHMENT"] },
                        submissions: { some: { enrollmentId: enrollment.id } }
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
                    where: { enrollmentId: enrollment.id },
                    include: { activity: true }
                }
            },
            orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
        });
    }

    static async getStudentLearningSubmissions(userId: string, organizationId: string) {
        const student = await this.getStudentByUserId(userId, organizationId);
        const enrollment = student?.enrollments[0];
        if (!student || !enrollment) return null;

        return prisma.submission.findMany({
            where: {
                enrollmentId: enrollment.id,
                activity: {
                    organizationId,
                    academicYearId: enrollment.academicYearId
                }
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
        const enrollment = student?.enrollments[0];
        if (!student || !enrollment) return null;

        const activities = await prisma.learningActivity.findMany({
            where: {
                organizationId,
                academicYearId: enrollment.academicYearId,
                supportCategory: { in: ["RECOMMENDATION", "REMEDIAL", "ENRICHMENT"] },
                submissions: { some: { enrollmentId: enrollment.id } }
            },
            include: {
                teachingAssignment: {
                    include: { subject: true, teacher: true }
                },
                submissions: {
                    where: { enrollmentId: enrollment.id },
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
                        sectionId: enrollment.sectionId
                    }
                }
            }
        });
        if (!teacher) throw new Error("Selected teacher is not assigned to your section");

        return prisma.supportFlag.create({
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
