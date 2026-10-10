import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const schools = await prisma.organizationUnit.findMany({
        where: { type: "SCHOOL" },
        include: {
            studentEnrollments: {
                include: {
                    student: true
                }
            }
        }
    });

    console.log("=== SCHOOLS AND THEIR STUDENTS ===");
    for (const sch of schools) {
        console.log(`\nSchool: ${sch.name} (ID: ${sch.id}) - Total Enrolled: ${sch.studentEnrollments.length}`);
        for (const enr of sch.studentEnrollments) {
            console.log(`  -> StudentID: ${enr.student.studentId} | Name: ${enr.student.firstName} ${enr.student.lastName} (Student PK: ${enr.student.id})`);
        }
    }

    // Also check un-enrolled students
    const unenrolled = await prisma.student.findMany({
        where: {
            enrollments: { none: {} }
        }
    });
    console.log(`\nUn-enrolled Students Total: ${unenrolled.length}`);
    for (const u of unenrolled) {
        console.log(`  -> StudentID: ${u.studentId} | Name: ${u.firstName} ${u.lastName} (PK: ${u.id})`);
    }
}

main().finally(() => prisma.$disconnect());
