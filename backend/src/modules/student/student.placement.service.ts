import { prisma } from "../../infrastructure/prisma/client.js";
import { EnrollmentStatus } from "../../generated/prisma/enums.js";

export interface WorkspaceSummary {
    totalEnrolled: number;
    totalPlaced: number;
    totalUnplaced: number;
    totalSections: number;
    totalConfiguredCapacity: number | null;
    totalRemainingCapacity: number | null;
    fullSectionsCount: number;
}

export interface SectionOccupancyItem {
    id: string;
    name: string;
    capacity: number | null;
    status: string;
    enrolledCount: number;
    remainingCapacity: number | null;
    isFull: boolean;
    homeroomTeacher: {
        id: string;
        name: string;
        email?: string;
    } | null;
}

export class StudentPlacementService {
    /**
     * Fetch all data required for the Classroom Placement Workspace:
     * - Active / selectable academic years
     * - School grades within the selected academic year
     * - Unplaced student pool
     * - Available sections with real-time occupancy and capacity metrics
     * - Cohort placement summary metrics
     */
    static async getPlacementWorkspace(
        organizationId: string,
        query: { academicYearId?: string; schoolGradeId?: string }
    ) {
        // 1. Resolve Academic Years for this school organization
        const academicYears = await prisma.academicYear.findMany({
            where: { organizationId },
            orderBy: [{ status: "asc" }, { startDate: "desc" }]
        });

        if (academicYears.length === 0) {
            return {
                academicYear: null,
                academicYears: [],
                schoolGrade: null,
                schoolGrades: [],
                summary: {
                    totalEnrolled: 0,
                    totalPlaced: 0,
                    totalUnplaced: 0,
                    totalSections: 0,
                    totalConfiguredCapacity: null,
                    totalRemainingCapacity: null,
                    fullSectionsCount: 0
                },
                sections: [],
                unplacedStudents: []
            };
        }

        // Selected or default (ACTIVE or first) academic year
        let activeYear = academicYears.find(y => y.id === query.academicYearId);
        if (!activeYear) {
            activeYear = academicYears.find(y => y.status === "ACTIVE") || academicYears[0];
        }
        if (!activeYear) {
            throw new Error("ACADEMIC_YEAR_NOT_FOUND");
        }

        const academicYearId = activeYear.id;

        // 2. Fetch School Grades for the academic year
        const schoolGrades = await prisma.schoolGrade.findMany({
            where: {
                academicYearId,
                academicYear: { organizationId },
                status: "ACTIVE"
            },
            include: { grade: true },
            orderBy: { grade: { level: "asc" } }
        });

        let selectedGrade = schoolGrades.find(g => g.id === query.schoolGradeId);
        if (!selectedGrade && schoolGrades.length > 0) {
            selectedGrade = schoolGrades[0];
        }

        if (!selectedGrade) {
            return {
                academicYear: activeYear,
                academicYears,
                schoolGrade: null,
                schoolGrades: [],
                summary: {
                    totalEnrolled: 0,
                    totalPlaced: 0,
                    totalUnplaced: 0,
                    totalSections: 0,
                    totalConfiguredCapacity: null,
                    totalRemainingCapacity: null,
                    fullSectionsCount: 0
                },
                sections: [],
                unplacedStudents: []
            };
        }

        const schoolGradeId = selectedGrade.id;

        // 3. Fetch Sections for the selected SchoolGrade
        const sections = await prisma.section.findMany({
            where: {
                schoolGradeId,
                schoolGrade: { academicYearId, academicYear: { organizationId } }
            },
            include: {
                homeroomTeacher: true
            },
            orderBy: { name: "asc" }
        });

        // 4. Calculate real occupancy for each section from actual StudentEnrollment records
        const sectionIds = sections.map(s => s.id);
        const activeEnrollments = await prisma.studentEnrollment.findMany({
            where: {
                sectionId: { in: sectionIds },
                organizationId,
                academicYearId,
                schoolGradeId,
                status: { in: [EnrollmentStatus.ENROLLED, EnrollmentStatus.ACTIVE] }
            },
            select: { sectionId: true }
        });

        const occupancyMap = new Map<string, number>();
        for (const enr of activeEnrollments) {
            if (enr.sectionId) {
                occupancyMap.set(enr.sectionId, (occupancyMap.get(enr.sectionId) || 0) + 1);
            }
        }

        let totalConfiguredCapacity: number | null = null;
        let totalRemainingCapacity: number | null = null;
        let fullSectionsCount = 0;

        const sectionItems: SectionOccupancyItem[] = sections.map(sec => {
            const enrolledCount = occupancyMap.get(sec.id) || 0;
            const cap = sec.capacity;
            const remainingCapacity = cap !== null ? Math.max(0, cap - enrolledCount) : null;
            const isFull = cap !== null ? enrolledCount >= cap : false;

            if (cap !== null) {
                totalConfiguredCapacity = (totalConfiguredCapacity || 0) + cap;
                totalRemainingCapacity = (totalRemainingCapacity || 0) + (remainingCapacity || 0);
            }
            if (isFull) {
                fullSectionsCount++;
            }

            return {
                id: sec.id,
                name: sec.name,
                capacity: cap,
                status: sec.status,
                enrolledCount,
                remainingCapacity,
                isFull,
                homeroomTeacher: sec.homeroomTeacher ? {
                    id: sec.homeroomTeacher.id,
                    name: `${sec.homeroomTeacher.firstName} ${sec.homeroomTeacher.lastName}`.trim(),
                    email: undefined
                } : null
            };
        });

        // 5. Fetch Unplaced Students in this specific grade cohort
        const unplacedEnrollments = await prisma.studentEnrollment.findMany({
            where: {
                organizationId,
                academicYearId,
                schoolGradeId,
                sectionId: null,
                status: { in: [EnrollmentStatus.ENROLLED, EnrollmentStatus.ACTIVE] }
            },
            include: {
                student: true
            },
            orderBy: [
                { student: { firstName: "asc" } },
                { student: { lastName: "asc" } }
            ]
        });

        const totalUnplaced = unplacedEnrollments.length;
        const totalPlaced = activeEnrollments.length;
        const totalEnrolled = totalPlaced + totalUnplaced;

        const summary: WorkspaceSummary = {
            totalEnrolled,
            totalPlaced,
            totalUnplaced,
            totalSections: sections.length,
            totalConfiguredCapacity,
            totalRemainingCapacity,
            fullSectionsCount
        };

        return {
            academicYear: activeYear,
            academicYears,
            schoolGrade: selectedGrade,
            schoolGrades,
            summary,
            sections: sectionItems,
            unplacedStudents: unplacedEnrollments.map(e => ({
                enrollmentId: e.id,
                studentId: e.student.studentId,
                id: e.student.id,
                fullName: `${e.student.firstName} ${e.student.fatherName || e.student.lastName} ${e.student.grandfatherName || ""}`.trim(),
                firstName: e.student.firstName,
                fatherName: e.student.fatherName,
                grandfatherName: e.student.grandfatherName,
                gender: e.student.gender,
                dateOfBirth: e.student.dateOfBirth,
                enrollmentDate: e.enrollmentDate,
                enrollmentType: e.enrollmentType,
                status: e.status
            }))
        };
    }

    /**
     * Assign a single unplaced student enrollment to a target section.
     * Enforces:
     * - School ownership & academic year active state
     * - Grade alignment (section.schoolGradeId === enrollment.schoolGradeId)
     * - Inactive/suspended section protection
     * - Real-time concurrency & capacity validation
     * - AuditLog recording
     */
    static async assignStudent(
        organizationId: string,
        enrollmentId: string,
        sectionId: string,
        operatorUserId?: string
    ) {
        if (!enrollmentId || !sectionId) {
            throw new Error("Both enrollmentId and sectionId are required");
        }

        return await prisma.$transaction(async (tx) => {
            // 1. Fetch and validate Target Section
            const section = await tx.section.findUnique({
                where: { id: sectionId },
                include: {
                    schoolGrade: {
                        include: { academicYear: true, grade: true }
                    }
                }
            });

            if (!section || section.schoolGrade.academicYear.organizationId !== organizationId) {
                throw new Error("Target section not found or does not belong to this school organization");
            }

            // Historical Academic Year Guard
            const yearStatus = section.schoolGrade.academicYear.status;
            if (yearStatus === "ARCHIVED" || yearStatus === "COMPLETED") {
                throw new Error(`Cannot place students in an ${yearStatus.toLowerCase()} academic year`);
            }

            // Section Status Guard
            if (section.status !== "ACTIVE") {
                throw new Error(`Cannot place students into an inactive or ${section.status.toLowerCase()} section`);
            }

            // 2. Fetch and validate Student Enrollment
            const enrollment = await tx.studentEnrollment.findUnique({
                where: { id: enrollmentId, organizationId },
                include: {
                    student: true,
                    schoolGrade: { include: { grade: true } },
                    academicYear: true
                }
            });

            if (!enrollment) {
                throw new Error("Student enrollment not found in this school organization");
            }

            if (enrollment.status !== EnrollmentStatus.ENROLLED && enrollment.status !== EnrollmentStatus.ACTIVE) {
                throw new Error(`Cannot place student with enrollment status "${enrollment.status}"`);
            }

            // Academic Year Match Guard
            if (enrollment.academicYearId !== section.schoolGrade.academicYearId) {
                throw new Error("Academic year mismatch between student enrollment and target section");
            }

            // Grade Cohort Match Guard
            if (enrollment.schoolGradeId !== section.schoolGradeId) {
                const enrollmentGradeName = enrollment.schoolGrade.grade.name;
                const sectionGradeName = section.schoolGrade.grade.name;
                throw new Error(
                    `Grade mismatch: Student is enrolled in ${enrollmentGradeName}, but section "${section.name}" belongs to ${sectionGradeName}`
                );
            }

            // Idempotency / Already Placed Guard
            if (enrollment.sectionId === sectionId) {
                return {
                    success: true,
                    noOp: true,
                    message: `Student is already placed in Section ${section.name}`,
                    enrollment
                };
            }

            if (enrollment.sectionId !== null && enrollment.sectionId !== sectionId) {
                throw new Error(
                    "Student is already placed in another section. Use section reassignment with a reason to move placed students."
                );
            }

            // 3. Concurrency Protection & Capacity Enforcement
            // Row-level lock target section row to serialize concurrent capacity evaluations
            await tx.$queryRaw`SELECT id, capacity FROM section WHERE id = ${sectionId} FOR UPDATE`;

            const currentOccupancy = await tx.studentEnrollment.count({
                where: {
                    sectionId,
                    status: { in: [EnrollmentStatus.ENROLLED, EnrollmentStatus.ACTIVE] }
                }
            });

            if (section.capacity !== null && currentOccupancy >= section.capacity) {
                throw new Error(
                    `SECTION_CAPACITY_EXCEEDED: Section "${section.name}" has reached its maximum capacity of ${section.capacity} students (currently full: ${currentOccupancy}/${section.capacity})`
                );
            }

            // 4. In-Place Section Placement Mutation
            const updatedEnrollment = await tx.studentEnrollment.update({
                where: { id: enrollmentId },
                data: {
                    sectionId: section.id,
                    status: EnrollmentStatus.ACTIVE
                }
            });

            // 5. Audit Trail
            await tx.auditLog.create({
                data: {
                    organizationId,
                    userId: operatorUserId || null,
                    action: "SECTION_ASSIGNED",
                    resource: "StudentEnrollment",
                    resourceId: enrollmentId,
                    oldValue: { sectionId: null },
                    newValue: {
                        sectionId: section.id,
                        sectionName: section.name,
                        gradeName: section.schoolGrade.grade.name,
                        academicYearId: section.schoolGrade.academicYearId
                    }
                }
            });

            return {
                success: true,
                message: `Successfully placed student ${enrollment.student.firstName} ${enrollment.student.lastName} into Section ${section.name}`,
                enrollment: updatedEnrollment,
                section: {
                    id: section.id,
                    name: section.name,
                    newOccupancy: currentOccupancy + 1,
                    capacity: section.capacity
                }
            };
        });
    }

    /**
     * Atomically place a batch of unplaced student enrollments into a target section.
     * Guaranteed: All students pass validation or entire batch is rolled back.
     * Enforces:
     * - School scope and active academic year
     * - Grade alignment for each student
     * - Atomic capacity verification: (currentOccupancy + count <= capacity)
     * - Batch audit logging
     */
    static async bulkAssignStudents(
        organizationId: string,
        enrollmentIds: string[],
        sectionId: string,
        operatorUserId?: string
    ) {
        if (!Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
            throw new Error("enrollmentIds must be a non-empty array of enrollment identifiers");
        }

        if (!sectionId) {
            throw new Error("sectionId is required");
        }

        const uniqueIds = Array.from(new Set(enrollmentIds));

        return await prisma.$transaction(async (tx) => {
            // 1. Fetch and validate Target Section
            const section = await tx.section.findUnique({
                where: { id: sectionId },
                include: {
                    schoolGrade: {
                        include: { academicYear: true, grade: true }
                    }
                }
            });

            if (!section || section.schoolGrade.academicYear.organizationId !== organizationId) {
                throw new Error("Target section not found or does not belong to this school organization");
            }

            const yearStatus = section.schoolGrade.academicYear.status;
            if (yearStatus === "ARCHIVED" || yearStatus === "COMPLETED") {
                throw new Error(`Cannot place students in an ${yearStatus.toLowerCase()} academic year`);
            }

            if (section.status !== "ACTIVE") {
                throw new Error(`Cannot place students into an inactive or ${section.status.toLowerCase()} section`);
            }

            // 2. Fetch and validate all student enrollments
            const enrollments = await tx.studentEnrollment.findMany({
                where: {
                    id: { in: uniqueIds },
                    organizationId
                },
                include: {
                    student: true,
                    schoolGrade: { include: { grade: true } }
                }
            });

            if (enrollments.length !== uniqueIds.length) {
                throw new Error(
                    `Validation failed: Expected ${uniqueIds.length} enrollments in this school, but only found ${enrollments.length}`
                );
            }

            // Validate every enrollment in the batch
            for (const enr of enrollments) {
                if (enr.status !== EnrollmentStatus.ENROLLED && enr.status !== EnrollmentStatus.ACTIVE) {
                    throw new Error(
                        `Cannot place student ${enr.student.firstName}: status is "${enr.status}"`
                    );
                }

                if (enr.academicYearId !== section.schoolGrade.academicYearId) {
                    throw new Error(
                        `Academic year mismatch for student ${enr.student.firstName}`
                    );
                }

                if (enr.schoolGradeId !== section.schoolGradeId) {
                    throw new Error(
                        `Grade mismatch: Student ${enr.student.firstName} is in ${enr.schoolGrade.grade.name}, but target is Section ${section.name} (${section.schoolGrade.grade.name})`
                    );
                }

                if (enr.sectionId !== null) {
                    throw new Error(
                        `Student ${enr.student.firstName} ${enr.student.lastName} is already placed in a section. Bulk placement only accepts unplaced students.`
                    );
                }
            }

            // 3. Concurrency Protection & Bulk Capacity Check
            await tx.$queryRaw`SELECT id, capacity FROM section WHERE id = ${sectionId} FOR UPDATE`;

            const currentOccupancy = await tx.studentEnrollment.count({
                where: {
                    sectionId,
                    status: { in: [EnrollmentStatus.ENROLLED, EnrollmentStatus.ACTIVE] }
                }
            });

            if (section.capacity !== null) {
                const availableSeats = section.capacity - currentOccupancy;
                if (uniqueIds.length > availableSeats) {
                    throw new Error(
                        `SECTION_CAPACITY_EXCEEDED: Cannot place ${uniqueIds.length} students into Section "${section.name}". Only ${Math.max(0, availableSeats)} seats remaining (capacity: ${section.capacity}, current: ${currentOccupancy})`
                    );
                }
            }

            // 4. Atomic Bulk In-Place Placement Mutation
            await tx.studentEnrollment.updateMany({
                where: { id: { in: uniqueIds } },
                data: {
                    sectionId: section.id,
                    status: EnrollmentStatus.ACTIVE
                }
            });

            // 5. Write Audit Logs for all placed students
            const auditData = uniqueIds.map(eId => ({
                organizationId,
                userId: operatorUserId || null,
                action: "SECTION_ASSIGNED",
                resource: "StudentEnrollment",
                resourceId: eId,
                oldValue: { sectionId: null },
                newValue: {
                    sectionId: section.id,
                    sectionName: section.name,
                    bulk: true,
                    cohortSize: uniqueIds.length
                }
            }));

            await tx.auditLog.createMany({
                data: auditData
            });

            return {
                success: true,
                count: uniqueIds.length,
                message: `Successfully placed ${uniqueIds.length} students into Section ${section.name}`,
                section: {
                    id: section.id,
                    name: section.name,
                    newOccupancy: currentOccupancy + uniqueIds.length,
                    capacity: section.capacity
                }
            };
        });
    }

    /**
     * Reassign an already-placed student from their current section to another section within the same grade.
     * CRITICAL NON-NEGOTIABLE RULE:
     * - Updates StudentEnrollment.sectionId in place.
     * - Does NOT create a new StudentEnrollment.
     * - Does NOT mark enrollment TRANSFERRED.
     * - Preserves all existing StudentAttendance, StudentResult, and Submission records.
     * - Mandates a non-empty administrative reason.
     * - Records historical transition in AuditLog.
     */
    static async reassignStudentSection(
        organizationId: string,
        data: { enrollmentId: string; targetSectionId: string; reason: string },
        operatorUserId?: string
    ) {
        const { enrollmentId, targetSectionId, reason } = data;

        if (!enrollmentId || !targetSectionId) {
            throw new Error("enrollmentId and targetSectionId are required");
        }

        const trimmedReason = (reason || "").trim();
        if (!trimmedReason || trimmedReason.length < 3) {
            throw new Error("A meaningful administrative reason (at least 3 characters) is required for section reassignment");
        }

        return await prisma.$transaction(async (tx) => {
            // 1. Fetch current Enrollment
            const enrollment = await tx.studentEnrollment.findUnique({
                where: { id: enrollmentId, organizationId },
                include: {
                    student: true,
                    section: true,
                    schoolGrade: { include: { grade: true, academicYear: true } }
                }
            });

            if (!enrollment) {
                throw new Error("Student enrollment not found in this school organization");
            }

            if (enrollment.status !== EnrollmentStatus.ENROLLED && enrollment.status !== EnrollmentStatus.ACTIVE) {
                throw new Error(`Cannot reassign student with enrollment status "${enrollment.status}"`);
            }

            if (!enrollment.sectionId) {
                throw new Error("Student is currently unplaced. Use standard placement instead of reassignment.");
            }

            if (enrollment.sectionId === targetSectionId) {
                throw new Error(
                    `Student is already placed in Section "${enrollment.section?.name || targetSectionId}". Target section must differ from current section.`
                );
            }

            // 2. Fetch and validate Target Section
            const targetSection = await tx.section.findUnique({
                where: { id: targetSectionId },
                include: {
                    schoolGrade: {
                        include: { academicYear: true, grade: true }
                    }
                }
            });

            if (!targetSection || targetSection.schoolGrade.academicYear.organizationId !== organizationId) {
                throw new Error("Target section not found or does not belong to this school organization");
            }

            const yearStatus = targetSection.schoolGrade.academicYear.status;
            if (yearStatus === "ARCHIVED" || yearStatus === "COMPLETED") {
                throw new Error(`Cannot reassign students in an ${yearStatus.toLowerCase()} academic year`);
            }

            if (targetSection.status !== "ACTIVE") {
                throw new Error(`Cannot reassign student into an inactive or ${targetSection.status.toLowerCase()} section`);
            }

            // Cross-Grade Reassignment Guard
            if (targetSection.schoolGradeId !== enrollment.schoolGradeId) {
                throw new Error(
                    `Cross-grade reassignment is prohibited. Student belongs to ${enrollment.schoolGrade.grade.name}, but target is Section ${targetSection.name} (${targetSection.schoolGrade.grade.name})`
                );
            }

            // Academic Year Guard
            if (targetSection.schoolGrade.academicYearId !== enrollment.academicYearId) {
                throw new Error("Academic year mismatch between student enrollment and target section");
            }

            // 3. Concurrency Protection & Capacity Validation on Target Section
            await tx.$queryRaw`SELECT id, capacity FROM section WHERE id = ${targetSectionId} FOR UPDATE`;

            const currentOccupancy = await tx.studentEnrollment.count({
                where: {
                    sectionId: targetSectionId,
                    status: { in: [EnrollmentStatus.ENROLLED, EnrollmentStatus.ACTIVE] }
                }
            });

            if (targetSection.capacity !== null && currentOccupancy >= targetSection.capacity) {
                throw new Error(
                    `SECTION_CAPACITY_EXCEEDED: Target Section "${targetSection.name}" has reached its maximum capacity of ${targetSection.capacity} students (currently full: ${currentOccupancy}/${targetSection.capacity})`
                );
            }

            const previousSectionName = enrollment.section?.name || "Unknown";

            // 4. In-Place Update — PRESERVES SAME ENROLLMENT ID AND ALL LINKED DATA
            const updatedEnrollment = await tx.studentEnrollment.update({
                where: { id: enrollmentId },
                data: {
                    sectionId: targetSection.id
                }
            });

            // 5. Append Status History note
            await tx.studentStatusHistory.create({
                data: {
                    enrollmentId,
                    status: enrollment.status,
                    reason: `Section Reassigned: ${previousSectionName} -> ${targetSection.name}. Reason: ${trimmedReason}`
                }
            });

            // 6. Record in AuditLog
            await tx.auditLog.create({
                data: {
                    organizationId,
                    userId: operatorUserId || null,
                    action: "SECTION_REASSIGNED",
                    resource: "StudentEnrollment",
                    resourceId: enrollmentId,
                    oldValue: {
                        sectionId: enrollment.sectionId,
                        sectionName: previousSectionName
                    },
                    newValue: {
                        sectionId: targetSection.id,
                        sectionName: targetSection.name,
                        reason: trimmedReason
                    }
                }
            });

            return {
                success: true,
                message: `Successfully reassigned student ${enrollment.student.firstName} from Section ${previousSectionName} to Section ${targetSection.name}`,
                enrollment: updatedEnrollment,
                fromSection: { id: enrollment.sectionId, name: previousSectionName },
                toSection: { id: targetSection.id, name: targetSection.name, newOccupancy: currentOccupancy + 1 }
            };
        });
    }

    /**
     * Retrieve the official Classroom Roster derived directly from StudentEnrollment.sectionId.
     * Provides:
     * - Section metadata, homeroom teacher, grade, academic year
     * - Alphabetically sorted student roster with roll numbers
     * - Gender and occupancy statistics
     */
    static async getSectionRoster(
        organizationId: string,
        sectionId: string,
        query?: { sortBy?: "name" | "studentId" | "gender"; sortOrder?: "asc" | "desc" }
    ) {
        const section = await prisma.section.findUnique({
            where: { id: sectionId },
            include: {
                homeroomTeacher: true,
                schoolGrade: {
                    include: {
                        grade: true,
                        academicYear: true
                    }
                }
            }
        });

        if (!section || section.schoolGrade.academicYear.organizationId !== organizationId) {
            throw new Error("Section not found or access denied");
        }

        const enrollments = await prisma.studentEnrollment.findMany({
            where: {
                sectionId,
                organizationId,
                status: { in: [EnrollmentStatus.ENROLLED, EnrollmentStatus.ACTIVE] }
            },
            include: {
                student: true
            }
        });

        // Deterministic sorting
        const sortBy = query?.sortBy || "name";
        const sortOrder = query?.sortOrder === "desc" ? -1 : 1;

        enrollments.sort((a, b) => {
            if (sortBy === "studentId") {
                return a.student.studentId.localeCompare(b.student.studentId) * sortOrder;
            }
            if (sortBy === "gender") {
                const gA = a.student.gender || "";
                const gB = b.student.gender || "";
                const cmp = gA.localeCompare(gB);
                if (cmp !== 0) return cmp * sortOrder;
            }
            // Default: 3-tier Ethiopian name sorting (firstName, fatherName, grandfatherName)
            const nameA = `${a.student.firstName} ${a.student.fatherName || ""} ${a.student.grandfatherName || ""}`.trim().toLowerCase();
            const nameB = `${b.student.firstName} ${b.student.fatherName || ""} ${b.student.grandfatherName || ""}`.trim().toLowerCase();
            return nameA.localeCompare(nameB) * sortOrder;
        });

        const maleCount = enrollments.filter(e => e.student.gender?.toUpperCase() === "MALE").length;
        const femaleCount = enrollments.filter(e => e.student.gender?.toUpperCase() === "FEMALE").length;

        return {
            section: {
                id: section.id,
                name: section.name,
                capacity: section.capacity,
                status: section.status,
                gradeName: section.schoolGrade.grade.name,
                gradeLevel: section.schoolGrade.grade.level,
                academicYearName: section.schoolGrade.academicYear.name,
                academicYearStatus: section.schoolGrade.academicYear.status,
                homeroomTeacher: section.homeroomTeacher ? {
                    id: section.homeroomTeacher.id,
                    name: `${section.homeroomTeacher.firstName} ${section.homeroomTeacher.lastName}`.trim()
                } : null
            },
            statistics: {
                totalEnrolled: enrollments.length,
                capacity: section.capacity,
                remainingSeats: section.capacity !== null ? Math.max(0, section.capacity - enrollments.length) : null,
                isFull: section.capacity !== null ? enrollments.length >= section.capacity : false,
                occupancyPercentage: section.capacity ? Math.min(100, Math.round((enrollments.length / section.capacity) * 100)) : null,
                maleCount,
                femaleCount
            },
            students: enrollments.map((enr, idx) => ({
                rollNumber: idx + 1,
                enrollmentId: enr.id,
                studentId: enr.student.studentId,
                fullName: `${enr.student.firstName} ${enr.student.fatherName || enr.student.lastName} ${enr.student.grandfatherName || ""}`.trim(),
                firstName: enr.student.firstName,
                fatherName: enr.student.fatherName,
                grandfatherName: enr.student.grandfatherName,
                gender: enr.student.gender,
                dateOfBirth: enr.student.dateOfBirth,
                enrollmentType: enr.enrollmentType,
                status: enr.status,
                enrollmentDate: enr.enrollmentDate
            }))
        };
    }

    /**
     * Retrieve audit history of placement and reassignment actions for an enrollment.
     */
    static async getEnrollmentPlacementHistory(organizationId: string, enrollmentId: string) {
        return prisma.auditLog.findMany({
            where: {
                organizationId,
                resource: "StudentEnrollment",
                resourceId: enrollmentId,
                action: { in: ["SECTION_ASSIGNED", "SECTION_REASSIGNED"] }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });
    }
}
