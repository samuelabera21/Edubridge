import { prisma } from './src/infrastructure/prisma/client.ts';

async function resetData() {
    console.log("Cleaning up school data for fresh test...");

    await prisma.timetable.deleteMany({});
    await prisma.studentAttendance.deleteMany({});
    await prisma.teacherAttendance.deleteMany({});
    await prisma.studentResult.deleteMany({});
    await prisma.assessment.deleteMany({});
    await prisma.submission.deleteMany({});
    await prisma.learningActivity.deleteMany({});
    await prisma.supportFlag.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.classroomObservation.deleteMany({});

    await prisma.teachingAssignment.deleteMany({});
    await prisma.studentEnrollment.deleteMany({});
    await prisma.studentStatusHistory.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.parentStudent.deleteMany({});
    await prisma.parent.deleteMany({});

    await prisma.section.deleteMany({});
    await prisma.schoolSubject.deleteMany({});
    await prisma.schoolGrade.deleteMany({});
    await prisma.subject.deleteMany({});
    await prisma.grade.deleteMany({});

    await prisma.teacher.deleteMany({});

    console.log("Database reset complete! (Admin user and Organization preserved).");
}

resetData().catch(console.error).finally(() => process.exit(0));
