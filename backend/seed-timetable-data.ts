import { prisma } from './src/infrastructure/prisma/client.ts';

async function seed() {
    const orgId = 'cmsr8mcbn0001a7mimiyk9pdr';
    const academicYearId = 'cmswaqnbf000b2ys4ygtsbmkt';

    console.log("Fetching grades and subjects...");
    const grades = await prisma.schoolGrade.findMany({ where: { academicYearId } });
    if (grades.length === 0) {
        console.log("No grades found for this academic year!");
        return;
    }

    const subjects = await prisma.schoolSubject.findMany({ where: { academicYearId }, include: { subject: true } });
    if (subjects.length === 0) {
        console.log("No subjects found for this academic year!");
        return;
    }

    // 1. Create 6 new teachers
    console.log("Creating 6 teachers...");
    const teachers = [];
    for (let i = 0; i < 6; i++) {
        const teacher = await prisma.teacher.create({
            data: {
                organizationId: orgId,
                firstName: "TeacherName" + i,
                lastName: "TeacherLast" + i,
                email: "teacher" + i + "@example.com",
                phoneNumber: "123456789" + i,
                status: "ACTIVE",
                availability: { blockedSlots: [] }
            }
        });
        teachers.push(teacher);
    }

    // 2. Assign teachers to grades, sections, and subjects
    console.log("Creating teaching assignments...");
    let assignmentsCreated = 0;
    
    // For each grade, find its sections
    for (const grade of grades) {
        const sections = await prisma.section.findMany({ where: { schoolGradeId: grade.id } });
        
        for (const section of sections) {
            // Assign 4 random subjects to each section
            const shuffledSubjects = [...subjects].sort(() => 0.5 - Math.random()).slice(0, 4);
            
            for (const subj of shuffledSubjects) {
                // Assign a random teacher
                const teacher = teachers[Math.floor(Math.random() * teachers.length)];
                
                await prisma.teachingAssignment.create({
                    data: {
                        academicYearId,
                        teacherId: teacher.id,
                        subjectId: subj.subjectId,
                        schoolGradeId: grade.id,
                        sectionId: section.id,
                        periodsPerWeek: 4 // default to 4 periods
                    }
                });
                assignmentsCreated++;
            }
        }
    }

    console.log(`Successfully created ${assignmentsCreated} teaching assignments across ${teachers.length} new teachers!`);
    console.log("You can now click 'Auto-Generate Timetable' in the UI.");
}

seed().catch(console.error).finally(() => process.exit(0));
