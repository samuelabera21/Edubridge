import { prisma } from "../src/infrastructure/prisma/client.js";
async function main() {
    const users = await prisma.user.findMany();
    console.log("Users in DB:", users);
}
main().finally(() => prisma.$disconnect());
