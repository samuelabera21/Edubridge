import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    console.log("🚀 Registering 10 students in Section 9A and assigning to registered teacher...");

    // 10 Students dataset
    const studentsData = [
        { studentId: "STU-2026-9A01", firstName: "Abebe", lastName: "Kebede", fatherName: "Kebede", gender: "MALE" },
        { studentId: "STU-2026-9A02", firstName: "Hana", lastName: "Muhu", fatherName: "Muhu", gender: "FEMALE" },
        { studentId: "STU-2026-9A03", firstName: "Daniel", lastName: "Afework", fatherName: "Afework", gender: "MALE" },
        { studentId: "STU-2026-9A04", firstName: "Kalkidan", lastName: "Tadesse", fatherName: "Tadesse", gender: "FEMALE" },
        { studentId: "STU-2026-9A05", firstName: "Solomon", lastName: "Getachew", fatherName: "Getachew", gender: "MALE" },
        { studentId: "STU-2026-9A06", firstName: "Mebrat", lastName: "Ayalew", fatherName: "Ayalew", gender: "FEMALE" },
        { studentId: "STU-2026-9A07", firstName: "Dawit", lastName: "Hailemariam", fatherName: "Hailemariam", gender: "MALE" },
        { studentId: "STU-2026-9A08", firstName: "Bethelhem", lastName: "Alemu", fatherName: "Alemu", gender: "FEMALE" },
        { studentId: "STU-2026-9A09", firstName: "Natnael", lastName: "Berhanu", fatherName: "Berhanu", gender: "MALE" },
        { studentId: "STU-2026-9A10", firstName: "Selamawit", lastName: "Girma", fatherName: "Girma", gender: "FEMALE" },
    ];

    // Find schools
    const basoSchool = await prisma.organizationUnit.findFirst({
        where: { name: { contains: "baso", mode: "insensitive" }, type: "SCHOOL" }
    }) || await prisma.organizationUnit.findFirst({ where: { type: "SCHOOL" } });

    if (!basoSchool) throw new Error("School not found");
    console.log(`\nTarget School: ${basoSchool.name} (${basoSchool.id})`);

    const academicYear = await prisma.academicYear.findFirst({
        where: { organizationId: basoSchool.id, status: "ACTIVE" }
    }) || await prisma.academicYear.findFirst({ where: { organizationId: basoSchool.id } });

    if (!academicYear) throw new Error("Academic Year not found");

    // Find or create Grade 9
    let grade9 = await prisma.grade.findFirst({
        where: { level: 9, organizationId: basoSchool.id }
    });
    if (!grade9) {
        grade9 = await prisma.grade.create({
            data: {
                level: 9,
                name: "Grade 9",
                organizationId: basoSchool.id,
                description: "Grade 9 Secondary Level"
            }
        });
    }

    // Find or create SchoolGrade for Grade 9 in active academic year
    let schoolGrade = await prisma.schoolGrade.findFirst({
        where: { gradeId: grade9.id, academicYearId: academicYear.id }
    });
    if (!schoolGrade) {
        schoolGrade = await prisma.schoolGrade.create({
            data: {
                gradeId: grade9.id,
                academicYearId: academicYear.id
            }
        });
    }

    // Find or update Section 9A
    let section9A = await prisma.section.findFirst({
        where: {
            schoolGradeId: schoolGrade.id,
            OR: [
                { name: "9A" },
                { name: "A" }
            ]
        }
    });

    if (!section9A) {
        section9A = await prisma.section.create({
            data: {
                name: "9A",
                schoolGradeId: schoolGrade.id,
                capacity: 40
            }
        });
    } else if (section9A.name === "A") {
        // Update name to 9A for clear labeling
        section9A = await prisma.section.update({
            where: { id: section9A.id },
            data: { name: "9A" }
        });
    }
    console.log(`Section 9A verified: ID=${section9A.id}, Name=${section9A.name}`);

    // Register 10 students into Section 9A
    console.log("\nEnrolling 10 students in Section 9A...");
    for (const item of studentsData) {
        const student = await prisma.student.upsert({
            where: { studentId: item.studentId },
            update: {
                firstName: item.firstName,
                lastName: item.lastName,
                fatherName: item.fatherName,
                gender: item.gender
            },
            create: {
                studentId: item.studentId,
                firstName: item.firstName,
                lastName: item.lastName,
                fatherName: item.fatherName,
                gender: item.gender,
                dateOfBirth: new Date("2010-04-12"),
                nationality: "Ethiopian",
                city: "Debre Berhan"
            }
        });

        // Check existing enrollment
        const existingEnrollment = await prisma.studentEnrollment.findFirst({
            where: {
                studentId: student.id,
                academicYearId: academicYear.id
            }
        });

        let enrollment;
        if (existingEnrollment) {
            enrollment = await prisma.studentEnrollment.update({
                where: { id: existingEnrollment.id },
                data: {
                    sectionId: section9A.id,
                    schoolGradeId: schoolGrade.id,
                    organizationId: basoSchool.id,
                    status: "ACTIVE"
                }
            });
        } else {
            enrollment = await prisma.studentEnrollment.create({
                data: {
                    studentId: student.id,
                    organizationId: basoSchool.id,
                    academicYearId: academicYear.id,
                    schoolGradeId: schoolGrade.id,
                    sectionId: section9A.id,
                    status: "ACTIVE"
                }
            });
        }

        console.log(`  ✓ Enrolled ${student.firstName} ${student.lastName} (${student.studentId}) -> Enrollment ID: ${enrollment.id}`);
    }

    // Resolve registered teacher
    let teacher = await prisma.teacher.findFirst({
        where: { organizationId: basoSchool.id },
        include: { assignments: true }
    });

    if (!teacher) {
        throw new Error("No registered teacher found in target school");
    }
    console.log(`\nRegistered Teacher: ${teacher.firstName} ${teacher.lastName} (ID: ${teacher.id})`);

    // Ensure Math subject exists
    let subject = await prisma.subject.findFirst({
        where: { organizationId: basoSchool.id, code: "MATH" }
    }) || await prisma.subject.findFirst({
        where: { organizationId: basoSchool.id }
    });

    if (!subject) {
        subject = await prisma.subject.create({
            data: {
                organizationId: basoSchool.id,
                name: "Mathematics",
                code: "MATH"
            }
        });
    }

    // Check or create Teaching Assignment for Section 9A
    let assignment = await prisma.teachingAssignment.findFirst({
        where: {
            teacherId: teacher.id,
            sectionId: section9A.id,
            academicYearId: academicYear.id
        }
    });

    if (!assignment) {
        assignment = await prisma.teachingAssignment.create({
            data: {
                teacherId: teacher.id,
                academicYearId: academicYear.id,
                schoolGradeId: schoolGrade.id,
                sectionId: section9A.id,
                subjectId: subject.id,
                periodsPerWeek: 5,
                status: "ACTIVE"
            }
        });
        console.log(`Created TeachingAssignment: ID=${assignment.id} (Subject: ${subject.name}, Section: 9A)`);
    } else {
        await prisma.teachingAssignment.update({
            where: { id: assignment.id },
            data: { status: "ACTIVE", subjectId: subject.id }
        });
        console.log(`Updated TeachingAssignment: ID=${assignment.id} (Subject: ${subject.name}, Section: 9A)`);
    }

    // Verify Demo School teacher as well if exists
    const demoTeacher = await prisma.teacher.findFirst({
        where: { user: { email: "asamnagiz2@gmail.com" } }
    });
    if (demoTeacher) {
        const demoSchoolGrade = await prisma.schoolGrade.findFirst({
            where: { academicYear: { organizationId: demoTeacher.organizationId }, grade: { level: 9 } }
        });
        const demoSection = demoSchoolGrade ? await prisma.section.findFirst({
            where: { schoolGradeId: demoSchoolGrade.id, OR: [{ name: "9A" }, { name: "A" }] }
        }) : null;
        const demoSubject = await prisma.subject.findFirst({ where: { organizationId: demoTeacher.organizationId } });

        if (demoSchoolGrade && demoSection && demoSubject) {
            const existingAssign = await prisma.teachingAssignment.findFirst({
                where: { teacherId: demoTeacher.id, sectionId: demoSection.id }
            });
            if (!existingAssign) {
                await prisma.teachingAssignment.create({
                    data: {
                        teacherId: demoTeacher.id,
                        academicYearId: demoSchoolGrade.academicYearId,
                        schoolGradeId: demoSchoolGrade.id,
                        sectionId: demoSection.id,
                        subjectId: demoSubject.id,
                        periodsPerWeek: 5,
                        status: "ACTIVE"
                    }
                });
                console.log(`Also assigned Section 9A to demo teacher ${demoTeacher.firstName} ${demoTeacher.lastName}`);
            }
        }
    }

    // Final verification of enrolled students in Section 9A
    const enrolledStudents = await prisma.studentEnrollment.findMany({
        where: { sectionId: section9A.id, status: "ACTIVE" },
        include: { student: true }
    });

    console.log(`\n🎉 SUCCESS! Section 9A now has ${enrolledStudents.length} active registered students:`);
    enrolledStudents.forEach((e, idx) => {
        console.log(`  ${idx + 1}. ${e.student.firstName} ${e.student.lastName} (ID: ${e.student.studentId}, Gender: ${e.student.gender})`);
    });
    console.log(`All assigned to Teacher: ${teacher.firstName} ${teacher.lastName}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
