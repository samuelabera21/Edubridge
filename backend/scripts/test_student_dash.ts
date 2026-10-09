import { prisma } from "../src/infrastructure/prisma/client.js";
import { StudentService } from "../src/modules/student/student.service.js";

async function main() {
    const studentUser = await prisma.user.findFirst({ where: { email: "student.butu@edubridge.local" } });
    if (!studentUser) {
        console.error("Student user not found!");
        process.exit(1);
    }

    const data = await StudentService.getStudentDashboard(studentUser.id, "cmurbi8ht000076mnpbd0z67h");
    console.log("=== STUDENT DASHBOARD DATA ===");
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
