import { prisma } from './infrastructure/prisma/client.js';

async function test() {
    try {
        console.log("Fetching grades...");
        const grades = await prisma.schoolGrade.findMany({ take: 1 });
        if (grades.length === 0) {
            console.log("No grades found");
            return;
        }
        const schoolGradeId = grades[0]?.id;
        if (!schoolGradeId) return;
        console.log("Creating section for grade:", schoolGradeId);
        
        const section = await prisma.section.create({
            data: {
                schoolGradeId,
                name: "TEST_SECTION_999",
                capacity: 50
            }
        });
        console.log("Created successfully:", section);
        
        // Clean up
        await prisma.section.delete({ where: { id: section.id } });
    } catch (e) {
        console.error("Prisma error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
test();
