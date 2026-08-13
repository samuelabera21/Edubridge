import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const email = process.argv[2];
    
    if (!email) {
        console.error("Please provide an email address as the first argument.");
        console.error("Usage: npx tsx scratch/promote-parent.ts <email>");
        process.exit(1);
    }

    console.log(`Promoting ${email} to PARENT...`);

    // 1. Find the user by email
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.error(`User with email ${email} not found.`);
        process.exit(1);
    }

    // 2. Ensure PARENT role exists
    let parentRole = await prisma.role.findUnique({
        where: { name: "PARENT" }
    });

    if (!parentRole) {
        parentRole = await prisma.role.create({
            data: {
                name: "PARENT",
                description: "Parent or Guardian of a student."
            }
        });
        console.log("Created PARENT role.");
    }

    // 3. Find EduBridge Demo School
    const school = await prisma.organizationUnit.findFirst({
        where: { name: "EduBridge Demo School" }
    });

    if (!school) {
        console.error("EduBridge Demo School not found. Run seed scripts first.");
        process.exit(1);
    }

    // 4. Assign the Role + Scope to the User
    const existingAssignment = await prisma.roleAssignment.findFirst({
        where: {
            userId: user.id,
            roleId: parentRole.id,
            scopeId: school.id
        }
    });

    if (existingAssignment) {
        console.log(`User ${email} is already a PARENT at ${school.name}.`);
    } else {
        // Remove other roles for this demo so they are purely a parent
        await prisma.roleAssignment.deleteMany({
            where: { userId: user.id }
        });

        await prisma.roleAssignment.create({
            data: {
                userId: user.id,
                roleId: parentRole.id,
                scopeId: school.id
            }
        });
        console.log(`Successfully assigned PARENT role at ${school.name} to ${email}!`);
    }

    // 5. Create Parent Record and Link to the Demo Student
    let parent = await prisma.parent.findUnique({
        where: { userId: user.id }
    });

    if (!parent) {
        parent = await prisma.parent.create({
            data: {
                userId: user.id,
                firstName: user.name.split(" ")[0] || "Demo",
                lastName: user.name.split(" ")[1] || "Parent",
                email: user.email
            }
        });
        console.log(`Created Parent record for ${email}`);
    }

    // Link to the demo student
    const studentUser = await prisma.user.findUnique({
        where: { email: "test@demo.school.et" }
    });
    
    if (studentUser) {
        const student = await prisma.student.findFirst();
        if (student) {
            const existingLink = await prisma.parentStudent.findUnique({
                where: {
                    parentId_studentId: {
                        parentId: parent.id,
                        studentId: student.id
                    }
                }
            });

            if (!existingLink) {
                await prisma.parentStudent.create({
                    data: {
                        parentId: parent.id,
                        studentId: student.id,
                        relationship: "Guardian"
                    }
                });
                console.log(`Linked parent ${email} to student ${student.firstName} ${student.lastName}`);
            }
        } else {
             console.log("No student record found to link.");
        }
    } else {
        console.log("Student user test@demo.school.et not found. Creating a generic link may fail.");
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
