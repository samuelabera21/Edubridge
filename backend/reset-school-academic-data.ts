import { prisma } from "./src/infrastructure/prisma/client.js";

async function resetSchoolAcademicData() {
    console.log("🧹 Starting clean reset of school academic data...");

    // 1. Announcements, Notifications & Messages
    await prisma.notification.deleteMany({});
    await prisma.announcement.deleteMany({});
    await prisma.message.deleteMany({});

    // 2. Classroom & Learning operations
    await prisma.timetable.deleteMany({});
    await prisma.timetableConfig.deleteMany({});
    await prisma.studentAttendance.deleteMany({});
    await prisma.teacherAttendance.deleteMany({});
    await prisma.attendanceCorrection.deleteMany({});
    await prisma.studentResult.deleteMany({});
    await prisma.assessment.deleteMany({});
    await prisma.submission.deleteMany({});
    await prisma.learningActivity.deleteMany({});
    await prisma.supportFlag.deleteMany({});
    await prisma.classroomObservation.deleteMany({});

    // 3. Teaching Assignments & Teacher specializations
    await prisma.teachingAssignment.deleteMany({});
    await prisma.teacherSpecialization.deleteMany({});
    await prisma.teacherQualification.deleteMany({});
    await prisma.teacherDocument.deleteMany({});

    // 4. Student Enrollments & Parent-Student links
    await prisma.studentEnrollment.deleteMany({});
    await prisma.studentStatusHistory.deleteMany({});
    await prisma.studentDocument.deleteMany({});
    await prisma.parentStudent.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.parent.deleteMany({});

    // 5. Academic structure (Sections, Subjects, Grades, Calendar, Academic Years)
    await prisma.section.deleteMany({});
    await prisma.schoolGradeSubject.deleteMany({});
    await prisma.schoolSubject.deleteMany({});
    await prisma.schoolGrade.deleteMany({});
    await prisma.calendarEvent.deleteMany({});
    await prisma.academicPeriod.deleteMany({});
    await prisma.academicCalendar.deleteMany({});
    await prisma.academicYear.deleteMany({});
    await prisma.subject.deleteMany({});
    await prisma.grade.deleteMany({});

    // 6. Teachers
    await prisma.teacher.deleteMany({});

    console.log("✅ School academic data cleared successfully!");
    console.log("ℹ️  User accounts, organization units, and admin role assignments are preserved.");
}

resetSchoolAcademicData()
    .catch((err) => {
        console.error("❌ Reset failed:", err);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
