import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    console.log("==================================================");
    console.log("🧹 EDU-BRIDGE: REMOVE SEEDED STUDENTS CLEANUP");
    console.log("==================================================");

    // Seeded student pattern prefixes
    const seededPrefixes = [
        "STU-2026-12A",
        "STU-2026-12B",
        "STU-2026-9A",
        "STU-9A-",
        "STU-9B-",
        "STU-10A-",
        "STU-9-",
        "STU-10-",
        "STU-11-",
        "STU-12-"
    ];

    const allStudents = await prisma.student.findMany({
        include: {
            enrollments: {
                include: {
                    organization: true,
                    schoolGrade: {
                        include: {
                            grade: true
                        }
                    },
                    section: true
                }
            },
            user: true
        }
    });

    const seededStudents = allStudents.filter(s =>
        seededPrefixes.some(prefix => s.studentId.startsWith(prefix))
    );

    const registeredStudents = allStudents.filter(s =>
        !seededPrefixes.some(prefix => s.studentId.startsWith(prefix))
    );

    console.log(`\n📊 Found ${allStudents.length} total students in database:`);
    console.log(`   - Seeded Students to delete: ${seededStudents.length}`);
    console.log(`   - Registered Students to preserve: ${registeredStudents.length}\n`);

    console.log("Preserved Registered Students:");
    for (const r of registeredStudents) {
        const schools = r.enrollments.map(e => e.organization?.name || "Unassigned").join(", ");
        console.log(`  ✅ [${r.studentId}] ${r.firstName} ${r.lastName} | School: ${schools}`);
    }

    if (seededStudents.length === 0) {
        console.log("\n✨ No seeded students found to delete.");
        return;
    }

    const seededIds = seededStudents.map(s => s.id);

    console.log("\nDeleting associated records for seeded students...");

    // Find all enrollment IDs for these students
    const enrollments = await prisma.studentEnrollment.findMany({
        where: { studentId: { in: seededIds } },
        select: { id: true }
    });
    const enrollmentIds = enrollments.map(e => e.id);

    if (enrollmentIds.length > 0) {
        // Delete child relations attached to enrollments
        await prisma.studentStatusHistory.deleteMany({
            where: { enrollmentId: { in: enrollmentIds } }
        });
        await prisma.studentAttendance.deleteMany({
            where: { enrollmentId: { in: enrollmentIds } }
        });
        await prisma.studentResult.deleteMany({
            where: { enrollmentId: { in: enrollmentIds } }
        });
        await prisma.submission.deleteMany({
            where: { enrollmentId: { in: enrollmentIds } }
        });
        await prisma.supportFlag.deleteMany({
            where: { enrollmentId: { in: enrollmentIds } }
        });
        await prisma.attendanceCorrection.deleteMany({
            where: { enrollmentId: { in: enrollmentIds } }
        });
        await prisma.studentDocument.deleteMany({
            where: { enrollmentId: { in: enrollmentIds } }
        });

        // Delete enrollments
        const deletedEnrollments = await prisma.studentEnrollment.deleteMany({
            where: { id: { in: enrollmentIds } }
        });
        console.log(`   - Deleted ${deletedEnrollments.count} student enrollments.`);
    }

    // Delete ParentStudent links if any
    const deletedParents = await prisma.parentStudent.deleteMany({
        where: { studentId: { in: seededIds } }
    });
    console.log(`   - Deleted ${deletedParents.count} parent-student links.`);

    // Delete Student Documents if any
    const deletedDocs = await prisma.studentDocument.deleteMany({
        where: { studentId: { in: seededIds } }
    });
    console.log(`   - Deleted ${deletedDocs.count} student documents.`);

    // Delete the Student records
    const deletedStudents = await prisma.student.deleteMany({
        where: { id: { in: seededIds } }
    });
    console.log(`   - Deleted ${deletedStudents.count} seeded student records.`);

    // Final verification
    const remainingStudents = await prisma.student.findMany({
        include: {
            enrollments: {
                include: {
                    organization: true,
                    schoolGrade: {
                        include: {
                            grade: true
                        }
                    },
                    section: true
                }
            }
        }
    });

    console.log("\n==================================================");
    console.log(`🎉 CLEANUP COMPLETE! Remaining Students: ${remainingStudents.length}`);
    console.log("==================================================");
    for (const s of remainingStudents) {
        const enrollDesc = s.enrollments.map(e => `${e.organization.name} (${e.schoolGrade?.grade?.name || 'No Grade'} - ${e.section?.name || 'No Section'})`).join(", ") || "No Enrollment";
        console.log(`  👤 [${s.studentId}] ${s.firstName} ${s.fatherName || ''} ${s.lastName} | Enrolled in: ${enrollDesc}`);
    }
}

main()
    .catch((err) => {
        console.error("❌ Cleanup failed:", err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
