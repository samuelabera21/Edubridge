import { prisma } from './src/infrastructure/prisma/client.ts';

async function run() {
    console.log("Students before:", await prisma.student.count());
    console.log("Enrollments before:", await prisma.studentEnrollment.count());
    
    // Delete all enrollments
    await prisma.studentStatusHistory.deleteMany();
    await prisma.studentEnrollment.deleteMany();
    
    // Delete all students
    await prisma.student.deleteMany();

    console.log("Students after:", await prisma.student.count());
    console.log("Enrollments after:", await prisma.studentEnrollment.count());
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
