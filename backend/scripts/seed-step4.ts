import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    console.log("Seeding Step 4: Teaching Activity & Lesson Continuity...");

    // 1. Get the organization and active year
    const school = await prisma.organizationUnit.findFirst({
        where: { type: "SCHOOL" }
    });
    if (!school) throw new Error("School not found. Run base seed first.");

    const activeYear = await prisma.academicYear.findFirst({
        where: { organizationId: school.id, status: "ACTIVE" }
    });
    if (!activeYear) throw new Error("Active academic year not found.");

    // 2. Setup a few Class Periods (e.g. Period 1, Period 2)
    const period1 = await prisma.classPeriod.upsert({
        where: { organizationId_name: { organizationId: school.id, name: "Period 1" } },
        update: {},
        create: { organizationId: school.id, name: "Period 1", startTime: "08:30", endTime: "09:15" }
    });
    const period2 = await prisma.classPeriod.upsert({
        where: { organizationId_name: { organizationId: school.id, name: "Period 2" } },
        update: {},
        create: { organizationId: school.id, name: "Period 2", startTime: "09:15", endTime: "10:00" }
    });

    // 3. Find our Teachers from Step 3
    const abebe = await prisma.teacher.findFirst({ where: { employeeId: "EMP-001" }, include: { assignments: true } });
    const almaz = await prisma.teacher.findFirst({ where: { employeeId: "EMP-002" }, include: { assignments: true } });
    
    if (!abebe || !almaz || abebe.assignments.length === 0 || almaz.assignments.length === 0) {
        throw new Error("Demo teachers not found. Make sure Step 3 seed was run successfully.");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // Create timetable for TODAY so it shows up on the dashboard!

    console.log(`Setting up timetable for today (Day ${dayOfWeek})...`);

    // 4. Create Timetable entries for Today
    await prisma.timetable.upsert({
        where: { teachingAssignmentId_classPeriodId_dayOfWeek: { teachingAssignmentId: abebe.assignments[0].id, classPeriodId: period1.id, dayOfWeek: dayOfWeek } },
        update: {},
        create: {
            organizationId: school.id,
            academicYearId: activeYear.id,
            teachingAssignmentId: abebe.assignments[0].id,
            classPeriodId: period1.id,
            dayOfWeek: dayOfWeek,
            roomId: "Room 101"
        }
    });

    await prisma.timetable.upsert({
        where: { teachingAssignmentId_classPeriodId_dayOfWeek: { teachingAssignmentId: abebe.assignments[1]?.id || abebe.assignments[0].id, classPeriodId: period2.id, dayOfWeek: dayOfWeek } },
        update: {},
        create: {
            organizationId: school.id,
            academicYearId: activeYear.id,
            teachingAssignmentId: abebe.assignments[1]?.id || abebe.assignments[0].id,
            classPeriodId: period2.id,
            dayOfWeek: dayOfWeek,
            roomId: "Room 102"
        }
    });

    await prisma.timetable.upsert({
        where: { teachingAssignmentId_classPeriodId_dayOfWeek: { teachingAssignmentId: almaz.assignments[0].id, classPeriodId: period1.id, dayOfWeek: dayOfWeek } },
        update: {},
        create: {
            organizationId: school.id,
            academicYearId: activeYear.id,
            teachingAssignmentId: almaz.assignments[0].id,
            classPeriodId: period1.id,
            dayOfWeek: dayOfWeek,
            roomId: "Science Lab"
        }
    });

    // 5. Mark Abebe as ABSENT today so we can see Missed Lessons!
    console.log("Marking Abebe as absent today to trigger missed lessons...");
    await prisma.teacherAttendance.upsert({
        where: { teacherId_date: { teacherId: abebe.id, date: today } },
        update: { status: "ABSENT", remarks: "Sick leave" },
        create: {
            teacher: { connect: { id: abebe.id } },
            organization: { connect: { id: school.id } },
            academicYear: { connect: { id: activeYear.id } },
            date: today,
            status: "ABSENT",
            remarks: "Sick leave"
        }
    });

    console.log("Seeding complete! You should see 2 Missed Lessons (Abebe) and 1 Completed Lesson (Almaz).");
}

main().catch(console.error).finally(() => prisma.$disconnect());
