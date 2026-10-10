import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    // Seeded student IDs
    const seededStudentPatterns = [
        "STU-2026-12A",
        "STU-2026-12B",
        "STU-2026-9A",
        "STU-9A-",
        "STU-9B-",
        "STU-10A-"
    ];

    const allStudents = await prisma.student.findMany({
        include: {
            enrollments: true,
            user: true
        }
    });

    const seededStudents = allStudents.filter(s => 
        seededStudentPatterns.some(pattern => s.studentId.startsWith(pattern))
    );

    const registeredStudents = allStudents.filter(s => 
        !seededStudentPatterns.some(pattern => s.studentId.startsWith(pattern))
    );

    console.log(`Seeded Students to Remove: ${seededStudents.length}`);
    console.log(`Registered Students to Keep: ${registeredStudents.length}`);
    console.log("\nRegistered Students:");
    for (const r of registeredStudents) {
        console.log(`  - [${r.studentId}] ${r.firstName} ${r.lastName}`);
    }

    const seededIds = seededStudents.map(s => s.id);

    // Check relations
    const [
        enrollmentsCount,
        attendanceCount,
        gradesCount,
        supportFlagsCount,
        studentDocsCount,
        parentLinksCount
    ] = await Promise.all([
        prisma.studentEnrollment.count({ where: { studentId: { in: seededIds } } }),
        prisma.studentAttendance.count({ where: { enrollment: { studentId: { in: seededIds } } } }),
        prisma.studentResult.count({ where: { enrollment: { studentId: { in: seededIds } } } }),
        prisma.supportFlag.count({ where: { enrollment: { studentId: { in: seededIds } } } }),
        prisma.studentDocument.count({ where: { studentId: { in: seededIds } } }),
        prisma.parentStudent.count({ where: { studentId: { in: seededIds } } })
    ]);

    console.log("\nRelated Records for Seeded Students:");
    console.log(`- Enrollments: ${enrollmentsCount}`);
    console.log(`- Attendance Records: ${attendanceCount}`);
    console.log(`- Assessment Grades: ${gradesCount}`);
    console.log(`- Support Flags: ${supportFlagsCount}`);
    console.log(`- Student Documents: ${studentDocsCount}`);
    console.log(`- Parent Links: ${parentLinksCount}`);
}

main().finally(() => prisma.$disconnect());
