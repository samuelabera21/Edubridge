import { auth } from "../src/modules/authentication/auth.js";
import { prisma } from "../src/infrastructure/prisma/client.js";
import { assignRoleToUser, assignPermissionToRole } from "../src/modules/authentication/authorization.service.js";

async function run() {
    const testEmail = `test_${Date.now()}@edubridge.local`;
    const testPassword = "password123";

    console.log(`Registering new user: ${testEmail}...`);
    // Need to use HTTP to hit Better Auth register endpoint since it's easier to get session that way
    const registerRes = await fetch("http://localhost:5000/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Origin": "http://localhost:5000" },
        body: JSON.stringify({ email: testEmail, password: testPassword, name: "Test User" })
    });

    if (!registerRes.ok) {
        console.error("Register failed:", await registerRes.text());
        return;
    }

    const setCookie = registerRes.headers.getSetCookie ? registerRes.headers.getSetCookie() : [registerRes.headers.get("set-cookie")].filter(Boolean);
    const cookieHeader = setCookie ? setCookie.join("; ") : "";
    const userData = await registerRes.json();
    const userId = userData.user.id;

    console.log("Assigning role and permissions directly...");
    await assignRoleToUser(userId, "SCHOOL_ADMIN", "Test School", "SCHOOL");
    await assignPermissionToRole("SCHOOL_ADMIN", "SCHOOL:VIEW", "View school");
    await assignPermissionToRole("SCHOOL_ADMIN", "SCHOOL:UPDATE", "Update school");

    console.log("Fetching /api/authorization/me ...");
    const authRes = await fetch("http://localhost:5000/api/authorization/me", {
        headers: { "Cookie": cookieHeader, "Origin": "http://localhost:5000" }
    });
    console.log("Auth Status:", authRes.status);
    console.log("Auth Body:", await authRes.json());
    
    console.log("Updating /api/school/profile ...");
    const updateRes = await fetch("http://localhost:5000/api/school/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Cookie": cookieHeader, "Origin": "http://localhost:5000" },
        body: JSON.stringify({ establishedYear: 2024, contactEmail: "info@testschool.local", phoneNumber: "+251911000000" })
    });
    console.log("Update Status:", updateRes.status);
    console.log("Update Body:", await updateRes.json());

    console.log("Fetching /api/school/profile ...");
    const profileRes = await fetch("http://localhost:5000/api/school/profile", {
        headers: { "Cookie": cookieHeader, "Origin": "http://localhost:5000" }
    });
    console.log("Profile Status:", profileRes.status);
    console.log("Profile Body:", await profileRes.json());
}

run().catch(console.error).finally(() => prisma.$disconnect());
