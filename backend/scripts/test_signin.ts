import { prisma } from "../src/infrastructure/prisma/client.js";
import { auth } from "../src/modules/authentication/auth.js";
import { hashPassword } from "better-auth/crypto";

async function testSignIn() {
    console.log("=== Testing Newly Registered Teacher Sign In ===");
    for (const pwd of ["ChangeMe123!", "EduBridge2026!"]) {
        try {
            const res = await auth.api.signInEmail({
                body: { email: "asamnagiz2@gmail.com", password: pwd },
                asResponse: true
            });
            console.log(`Password "${pwd}" Status:`, res.status);
            if (res.status === 200) {
                console.log(`>>> SUCCESS! The default password is: "${pwd}" <<<`);
                return;
            }
        } catch (err: any) {
            console.log(`Password "${pwd}" failed`);
        }
    }
}

testSignIn().catch(console.error).finally(() => prisma.$disconnect());
