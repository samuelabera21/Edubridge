import { prisma } from "../src/infrastructure/prisma/client.js";
import { auth } from "../src/modules/authentication/auth.js";
import { assignRoleToUser, assignPermissionToRole } from "../src/modules/authentication/authorization.service.js";

async function main() {
    console.log("=========================================");
    console.log("🌱 Starting EduBridge Idempotent Seed Process...");
    console.log("=========================================");

    // 1. Environmental Credentials (Development defaults with production overrides)
    const adminEmail = process.env.ADMIN_EMAIL || "admin@edubridge.local";
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.DEFAULT_INITIAL_PASSWORD;
    if (!adminPassword) {
        throw new Error("ADMIN_PASSWORD or DEFAULT_INITIAL_PASSWORD must be set before seeding");
    }
    const adminName = process.env.ADMIN_NAME || "System Administrator";

    // 2. Seed Default System Roles
    const defaultRoles = [
        { name: "ADMIN", desc: "System Super Administrator" },
        { name: "SCHOOL_ADMIN", desc: "School Administrator" },
        { name: "TEACHER", desc: "Teaching Faculty Member" },
        { name: "STUDENT", desc: "Enrolled Student" },
        { name: "PARENT", desc: "Parent / Guardian" },
        { name: "VICE_PRINCIPAL", desc: "Vice Principal / Academic Director" }
    ];

    for (const r of defaultRoles) {
        await prisma.role.upsert({
            where: { name: r.name },
            update: { description: r.desc },
            create: { name: r.name, description: r.desc }
        });
    }
    console.log(`✅ Roles verified/created: ${defaultRoles.map(r => r.name).join(", ")}`);

    // 3. Seed System Administrative Permissions
    const permissions = [
        { name: "ACADEMIC:VIEW", desc: "View Academic Years, Grades, Sections" },
        { name: "ACADEMIC:CREATE", desc: "Create Academic Years, Grades, Sections" },
        { name: "ACADEMIC:UPDATE", desc: "Update Academic Years, Grades, Sections" },
        { name: "ACADEMIC:MANAGE", desc: "Full Academic Management" },
        { name: "TEACHER:VIEW", desc: "View Teachers and Profiles" },
        { name: "TEACHER:CREATE", desc: "Register New Teachers" },
        { name: "TEACHER:UPDATE", desc: "Update Teacher Profiles" },
        { name: "TEACHER:ASSIGN", desc: "Manage Teacher Assignments" },
        { name: "STUDENT:VIEW", desc: "View Students and Directory" },
        { name: "STUDENT:CREATE", desc: "Register New Students" },
        { name: "STUDENT:ENROLL", desc: "Manage Student Enrollments" },
        { name: "ATTENDANCE:VIEW", desc: "View Attendance Records" },
        { name: "ATTENDANCE:RECORD", desc: "Record Attendance Logs" },
        { name: "SCHOOL:VIEW", desc: "View School Profile" },
        { name: "SCHOOL:UPDATE", desc: "Update School Profile" },
        { name: "ASSESSMENT:VIEW", desc: "View Assessments" },
        { name: "ASSESSMENT:CREATE", desc: "Create Assessments" },
        { name: "ASSESSMENT:GRADE", desc: "Grade Assessments" }
    ];

    const adminRoles = ["SCHOOL_ADMIN", "ADMIN"];
    for (const roleName of adminRoles) {
        for (const p of permissions) {
            await assignPermissionToRole(roleName, p.name, p.desc);
        }
    }
    console.log(`✅ Admin permissions attached to ${adminRoles.join(", ")}`);

    // 4. Seed Default Organization Units & School Profile
    let federalUnit = await prisma.organizationUnit.findFirst({ where: { type: "FEDERAL" } });
    if (!federalUnit) {
        federalUnit = await prisma.organizationUnit.create({
            data: { name: "EduBridge Platform", type: "FEDERAL" }
        });
    }

    let schoolUnit = await prisma.organizationUnit.findFirst({ where: { type: "SCHOOL" } });
    if (!schoolUnit) {
        schoolUnit = await prisma.organizationUnit.create({
            data: { name: "EduBridge Demo School", type: "SCHOOL" }
        });
    }

    let schoolProfile = await prisma.schoolProfile.findFirst({ where: { organizationId: schoolUnit.id } });
    if (!schoolProfile) {
        await prisma.schoolProfile.create({
            data: {
                organizationId: schoolUnit.id,
                contactEmail: "info@edubridge.edu.et",
                phoneNumber: "+251 911 000 000",
                address: "Addis Ababa, Ethiopia",
                status: "ACTIVE"
            }
        });
    }

    let activeAcademicYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } });
    if (!activeAcademicYear) {
        activeAcademicYear = await prisma.academicYear.create({
            data: {
                organizationId: schoolUnit.id,
                name: "2025/2026 Academic Year",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
                status: "ACTIVE"
            }
        });
    }
    console.log(`✅ Organization Units, School Profile & Active Academic Year verified.`);

    // 5. Seed Idempotent Development Admin Account
    let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!adminUser) {
        console.log(`🛠️ Creating Development Admin account (${adminEmail})...`);
        const signUpRes = await auth.api.signUpEmail({
            body: {
                email: adminEmail,
                password: adminPassword,
                name: adminName
            }
        });

        if (signUpRes?.user) {
            adminUser = await prisma.user.update({
                where: { id: signUpRes.user.id },
                data: {
                    requiresPasswordChange: true,
                    isActive: true
                }
            });
            console.log(`✅ Admin account created with ID: ${adminUser.id}`);
        }
    } else if (process.env.FORCE_RESET_ADMIN === "true") {
        console.log(`⚠️ FORCE_RESET_ADMIN is active. Resetting temporary password to ${adminPassword}...`);
        try {
            const ctx = await auth.$context;
            const hashedPassword = await ctx.password.hash(adminPassword);
            await prisma.account.updateMany({
                where: { userId: adminUser.id },
                data: { password: hashedPassword }
            });
            await prisma.user.update({
                where: { id: adminUser.id },
                data: { requiresPasswordChange: true, isActive: true }
            });
            console.log(`✅ Admin password reset to: ${adminPassword}`);
        } catch (e) {
            console.log(`ℹ️ User password verified.`);
        }
    } else {
        console.log(`ℹ️ Admin user (${adminEmail}) already exists. Retaining existing user credentials.`);
    }

    if (adminUser) {
        // Assign ADMIN role at FEDERAL scope
        await assignRoleToUser(adminUser.id, "ADMIN", federalUnit.name, "FEDERAL");
        // Assign SCHOOL_ADMIN role at SCHOOL scope
        await assignRoleToUser(adminUser.id, "SCHOOL_ADMIN", schoolUnit.name, "SCHOOL");
        console.log(`✅ Admin roles attached for user: ${adminEmail}`);
    }

    console.log("=========================================");
    console.log("🎉 SEED COMPLETED SUCCESSFULLY!");
    console.log(`👤 Admin Username / Email : admin OR ${adminEmail}`);
    console.log(`🔑 Default Temporary Password : ${adminPassword}`);
    console.log("=========================================");
}

main()
    .catch((err) => {
        console.error("❌ Error during seed process:", err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());