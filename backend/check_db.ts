import { prisma } from './src/infrastructure/prisma/client.ts';
async function run() {
    console.log("Students:");
    console.dir(await prisma.student.findMany(), {depth: null});
    console.log("Enrollments:");
    console.dir(await prisma.studentEnrollment.findMany(), {depth: null});
}
run().finally(() => prisma.$disconnect());
