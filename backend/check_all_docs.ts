import { prisma } from './src/infrastructure/prisma/client.ts';
async function run() {
    const students = await prisma.student.findMany();
    students.forEach(student => {
        console.log("Student:", student.firstName, student.id);
        const docs = student.documents as any;
        console.log("Documents:", docs ? Object.keys(docs) : "No docs");
        if (docs) {
            console.log("birthCertificate exists:", !!docs.birthCertificate);
            console.log("transcript exists:", !!docs.transcript);
            console.log("parentID exists:", !!docs.parentID);
        }
    });
}
run().finally(() => prisma.$disconnect());
