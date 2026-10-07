import { prisma } from "../src/infrastructure/prisma/client.js";
import { TeacherService } from "../src/modules/teacher/teacher.service.js";

async function main() {
    const teacher = await prisma.teacher.findFirst({
        where: { user: { email: "tch.2026.0012@edubridge.local" } },
        include: { user: true }
    });
    if (!teacher || !teacher.userId) throw new Error("Teacher user not found");

    console.log(`Testing dashboard summary for Teacher: ${teacher.firstName} ${teacher.lastName} (User ID: ${teacher.userId}, Org ID: ${teacher.organizationId})`);
    const summary = await TeacherService.getDashboardSummary(teacher.userId, teacher.organizationId);

    console.log("\n=== DASHBOARD SUMMARY RESULT ===");
    console.log("Total Students:", summary.totalStudents);
    console.log("Students By Grade:", summary.studentsByGrade);
    console.log("Gender Distribution:", summary.genderDistribution);
    console.log("Today Classes:", summary.todayClasses.map(c => ({ subject: c.subject, section: c.section, students: c.studentCount, status: c.status })));
    console.log("Students Requiring Attention:", summary.studentsRequiringAttention.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
