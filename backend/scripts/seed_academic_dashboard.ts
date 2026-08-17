import { prisma } from "../src/infrastructure/prisma/client.ts";

async function main() {
    console.log("Starting Academic Dashboard Seeding...");

    // 1. Get or Create an Organization
    let org = await prisma.organizationUnit.findFirst({ where: { type: "SCHOOL" } });
    if (!org) {
        org = await prisma.organizationUnit.create({
            data: {
                name: "EduBridge Demo School",
                type: "SCHOOL"
            }
        });
        console.log(`Created Organization: ${org.name}`);
    }

    // 2. Get or Create Academic Year
    let year = await prisma.academicYear.findFirst({ where: { organizationId: org.id } });
    if (!year) {
        year = await prisma.academicYear.create({
            data: {
                organizationId: org.id,
                name: "2018 E.C.",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
                status: "ACTIVE"
            }
        });
        console.log(`Created Academic Year: ${year.name}`);
    }

    // 3. Create Grades & Subjects if they don't exist
    const gradesData = ["Grade 9", "Grade 10"];
    const subjectsData = ["Mathematics", "Physics", "English", "Biology"];
    
    for (let j = 0; j < gradesData.length; j++) {
        const gName = gradesData[j];
        await prisma.grade.upsert({
            where: { organizationId_name: { organizationId: org.id, name: gName } },
            update: {},
            create: { organizationId: org.id, name: gName, level: 9 + j }
        });
    }

    for (const sName of subjectsData) {
        await prisma.subject.upsert({
            where: { organizationId_name: { organizationId: org.id, name: sName } },
            update: {},
            create: { organizationId: org.id, name: sName, code: sName.substring(0, 3).toUpperCase() }
        });
    }

    const grades = await prisma.grade.findMany();
    const subjects = await prisma.subject.findMany();

    // Link Grades and Subjects to the Academic Year
    for (const grade of grades) {
        const schoolGrade = await prisma.schoolGrade.findFirst({ where: { gradeId: grade.id, academicYearId: year.id } });
        if (!schoolGrade) {
            const sg = await prisma.schoolGrade.create({
                data: { academicYearId: year.id, gradeId: grade.id }
            });
            // Create Sections
            await prisma.section.createMany({
                data: [
                    { schoolGradeId: sg.id, name: `${grade.name.split(" ")[1]}A` },
                    { schoolGradeId: sg.id, name: `${grade.name.split(" ")[1]}B` }
                ]
            });
        }
    }

    for (const subject of subjects) {
        const existing = await prisma.schoolSubject.findFirst({
            where: { academicYearId: year.id, subjectId: subject.id }
        });
        if (!existing) {
            await prisma.schoolSubject.create({
                data: { academicYearId: year.id, subjectId: subject.id }
            });
        }
    }

    // 4. Create Teachers
    const teachersData = [
        { firstName: "Abebe", lastName: "Kebede", email: "abebe@edubridge.test", phone: "0911000001" },
        { firstName: "Hana", lastName: "Tadesse", email: "hana@edubridge.test", phone: "0911000002" },
        { firstName: "Dawit", lastName: "Mekonnen", email: "dawit@edubridge.test", phone: "0911000003" }
    ];

    for (const t of teachersData) {
        let user = await prisma.user.findFirst({ where: { email: t.email } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    id: t.email,
                    email: t.email,
                    name: `${t.firstName} ${t.lastName}`
                }
            });
            await prisma.teacher.create({
                data: {
                    userId: user.id,
                    organizationId: org.id,
                    firstName: t.firstName,
                    lastName: t.lastName
                }
            });
        }
    }

    const teachers = await prisma.teacher.findMany({ where: { organizationId: org.id } });
    const sections = await prisma.section.findMany({ where: { schoolGrade: { academicYearId: year.id } } });

    // 5. Create Teaching Assignments
    console.log("Creating Teaching Assignments...");
    for (const section of sections) {
        for (let i = 0; i < 2; i++) {
            const teacher = teachers[i % teachers.length];
            const subject = subjects[i % subjects.length];
            const existing = await prisma.teachingAssignment.findFirst({
                where: { teacherId: teacher.id, sectionId: section.id, subjectId: subject.id }
            });
            if (!existing) {
                await prisma.teachingAssignment.create({
                    data: {
                        teacherId: teacher.id,
                        academicYearId: year.id,
                        subjectId: subject.id,
                        schoolGradeId: section.schoolGradeId,
                        sectionId: section.id
                    }
                });
            }
        }
    }

    // 6. Create Students & Enrollments
    console.log("Creating Students and Enrollments...");
    for (const section of sections) {
        for (let i = 1; i <= 5; i++) {
            const studentIdNumber = `STU-${section.name}-${i}`;
            let student = await prisma.student.findUnique({ where: { studentId: studentIdNumber } });
            if (!student) {
                student = await prisma.student.create({
                    data: {
                        studentId: studentIdNumber,
                        firstName: `Student${i}`,
                        lastName: section.name
                    }
                });
                await prisma.studentEnrollment.create({
                    data: {
                        studentId: student.id,
                        organizationId: org.id,
                        academicYearId: year.id,
                        schoolGradeId: section.schoolGradeId,
                        sectionId: section.id,
                        status: "ENROLLED"
                    }
                });
            }
        }
    }

    // 7. Create Timetable for Today
    console.log("Creating Timetable for Today...");
    const assignments = await prisma.teachingAssignment.findMany({ where: { academicYearId: year.id } });
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Ensure ClassPeriods exist
    for (let i = 0; i < 4; i++) {
        const pName = `Period ${i + 1}`;
        await prisma.classPeriod.upsert({
            where: { organizationId_name: { organizationId: org.id, name: pName } },
            update: {},
            create: { organizationId: org.id, name: pName, startTime: `0${8 + i}:00`, endTime: `0${8 + i}:45` }
        });
    }
    const periods = await prisma.classPeriod.findMany({ where: { organizationId: org.id } });

    for (let i = 0; i < assignments.length; i++) {
        const classPeriodId = periods[i % periods.length].id;
        const existing = await prisma.timetable.findFirst({
            where: { teachingAssignmentId: assignments[i].id, dayOfWeek }
        });
        if (!existing) {
            await prisma.timetable.create({
                data: {
                    teachingAssignmentId: assignments[i].id,
                    organizationId: org.id,
                    academicYearId: year.id,
                    classPeriodId,
                    dayOfWeek: dayOfWeek
                }
            });
        }
    }

    // 8. Teacher Attendance (Make 1 absent)
    console.log("Recording Teacher Attendance...");
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    
    if (teachers.length > 0) {
        const existingAbs = await prisma.teacherAttendance.findFirst({
            where: { teacherId: teachers[0].id, date: todayStart }
        });
        if (!existingAbs) {
            await prisma.teacherAttendance.create({
                data: {
                    teacherId: teachers[0].id,
                    academicYearId: year.id,
                    organizationId: org.id,
                    date: todayStart,
                    status: "ABSENT",
                    remarks: "Sick"
                }
            });
        }
        for (let i = 1; i < teachers.length; i++) {
            const existingPres = await prisma.teacherAttendance.findFirst({
                where: { teacherId: teachers[i].id, date: todayStart }
            });
            if (!existingPres) {
                await prisma.teacherAttendance.create({
                    data: {
                        teacherId: teachers[i].id,
                        academicYearId: year.id,
                        organizationId: org.id,
                        date: todayStart,
                        status: "PRESENT"
                    }
                });
            }
        }
    }

    // 9. Student Attendance (Some present, some absent)
    console.log("Recording Student Attendance...");
    const enrollments = await prisma.studentEnrollment.findMany({ where: { academicYearId: year.id } });
    for (let i = 0; i < enrollments.length; i++) {
        const isAbsent = i % 5 === 0; // 20% absent
        const existing = await prisma.studentAttendance.findFirst({
            where: { enrollmentId: enrollments[i].id, date: todayStart }
        });
        if (!existing) {
            await prisma.studentAttendance.create({
                data: {
                    enrollmentId: enrollments[i].id,
                    academicYearId: year.id,
                    organizationId: org.id,
                    date: todayStart,
                    status: isAbsent ? "ABSENT" : "PRESENT"
                }
            });
        }
    }

    // 10. Assessments & Results
    console.log("Creating Assessments...");
    if (assignments.length > 0) {
        const existingAsst = await prisma.assessment.findFirst({
            where: { teachingAssignmentId: assignments[0].id }
        });
        let asst = existingAsst;
        if (!asst) {
            asst = await prisma.assessment.create({
                data: {
                    organizationId: org.id,
                    academicYearId: year.id,
                    teachingAssignmentId: assignments[0].id,
                    title: "Midterm Exam",
                    type: "EXAM",
                    maxScore: 100,
                    dueDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
                }
            });
        }

        const targetSectionId = assignments[0].sectionId;
        const targetStudents = enrollments.filter(e => e.sectionId === targetSectionId);
        for (let i = 0; i < targetStudents.length; i++) {
            const existingRes = await prisma.studentResult.findFirst({
                where: { assessmentId: asst.id, enrollmentId: targetStudents[i].id }
            });
            if (!existingRes) {
                await prisma.studentResult.create({
                    data: {
                        assessmentId: asst.id,
                        enrollmentId: targetStudents[i].id,
                        score: 50 + (i * 10) % 50 // 50-90 range
                    }
                });
            }
        }
    }

    // 11. Upcoming Assessment
    console.log("Creating Upcoming Assessment...");
    if (assignments.length > 0) {
        const existingUpcoming = await prisma.assessment.findFirst({
            where: { title: "Final Project" }
        });
        if (!existingUpcoming) {
            await prisma.assessment.create({
                data: {
                    organizationId: org.id,
                    academicYearId: year.id,
                    teachingAssignmentId: assignments[0].id,
                    title: "Final Project",
                    type: "ASSIGNMENT",
                    maxScore: 100,
                    dueDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000) // 2 weeks in future
                }
            });
        }
    }

    // 12. Announcements
    console.log("Creating Announcements...");
    const existingAnn = await prisma.announcement.findFirst({
        where: { title: "Teacher Training Next Week" }
    });
    if (!existingAnn) {
        // Find an admin user to author it, or just use a dummy string since it's a seed script,
        // Wait, authorId must match a User. Let's find any user.
        const adminUser = await prisma.user.findFirst();
        if (adminUser) {
            await prisma.announcement.create({
                data: {
                    organizationId: org.id,
                    title: "Teacher Training Next Week",
                    content: "Please ensure all teachers attend the mandatory curriculum training.",
                    target: "TEACHERS",
                    authorId: adminUser.id,
                    expiresAt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
                }
            });
        }
    }

    console.log("Seeding Completed Successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
