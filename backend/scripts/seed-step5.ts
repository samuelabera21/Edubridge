import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    console.log("Seeding Step 5: Classroom Observations...");

    const school = await prisma.organizationUnit.findFirst({
        where: { type: "SCHOOL" }
    });
    if (!school) throw new Error("School not found");

    const academicYear = await prisma.academicYear.findFirst({
        where: { organizationId: school.id, status: "ACTIVE" }
    });
    if (!academicYear) throw new Error("Active academic year not found");

    const vpUser = await prisma.user.findFirst({
        where: { email: "vp@demo.school.et" }
    });
    if (!vpUser) throw new Error("VP user not found");

    const teacher = await prisma.teacher.findFirst({
        where: { firstName: "Abebe", lastName: "Kebede" }
    });
    if (!teacher) throw new Error("Teacher Abebe not found");

    const assignment = await prisma.teachingAssignment.findFirst({
        where: { teacherId: teacher.id, academicYearId: academicYear.id },
        include: { subject: true, schoolGrade: true, section: true }
    });
    if (!assignment) throw new Error("Abebe has no teaching assignment");

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);

    await prisma.classroomObservation.deleteMany({}); // reset

    await prisma.classroomObservation.create({
        data: {
            organizationId: school.id,
            academicYearId: academicYear.id,
            observerId: vpUser.id,
            teacherId: teacher.id,
            subjectId: assignment.subjectId,
            schoolGradeId: assignment.schoolGradeId,
            sectionId: assignment.sectionId,
            date: pastDate,
            topic: "Algebra - Polynomials",
            strengths: "Good student participation.\nClear learning objectives.",
            weaknesses: "Limited formative assessment.\nPacing was slightly slow.",
            recommendations: "Use short formative checks during the lesson.\nIncrease the number of practice problems.",
            feedback: "Overall good lesson. Work on pacing.",
            followUpAction: "Use short formative checks.",
            followUpDate: futureDate,
            status: "COMPLETED"
        }
    });

    const teacher2 = await prisma.teacher.findFirst({
        where: { firstName: "Almaz", lastName: "Tadesse" }
    });
    if (teacher2) {
        const assignment2 = await prisma.teachingAssignment.findFirst({
            where: { teacherId: teacher2.id, academicYearId: academicYear.id },
            include: { subject: true, schoolGrade: true, section: true }
        });
        
        if (assignment2) {
            await prisma.classroomObservation.create({
                data: {
                    organizationId: school.id,
                    academicYearId: academicYear.id,
                    observerId: vpUser.id,
                    teacherId: teacher2.id,
                    subjectId: assignment2.subjectId,
                    schoolGradeId: assignment2.schoolGradeId,
                    sectionId: assignment2.sectionId,
                    date: futureDate,
                    topic: "Kinematics - Velocity",
                    status: "SCHEDULED"
                }
            });
        }
    }

    console.log("Classroom Observations seeded successfully!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
