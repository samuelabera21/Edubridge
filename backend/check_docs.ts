import { prisma } from './src/infrastructure/prisma/client.ts';
async function run() {
    const student = await prisma.student.findUnique({
        where: { id: "cmsx5630x00002ys4mxeptfly" }
    });
    if (!student) {
        console.log("Student not found");
        return;
    }
    const docs = student.documents as any;
    console.log("Documents keys:", docs ? Object.keys(docs) : "No docs");
    if (docs) {
        console.log("birthCertificate exists:", !!docs.birthCertificate);
        console.log("transcript exists:", !!docs.transcript);
        console.log("parentID exists:", !!docs.parentID);
    }
}
run().finally(() => prisma.$disconnect());
