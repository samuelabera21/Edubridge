import { prisma } from "../src/infrastructure/prisma/client.js";
import { assignPermissionToRole } from "../src/modules/authentication/authorization.service.js";
import { hashPassword } from "better-auth/crypto";

const FEDERAL_ADMIN_EMAIL = process.env.FEDERAL_ADMIN_EMAIL || "federal.admin@edubridge.gov.et";
const FEDERAL_ADMIN_PASSWORD = process.env.FEDERAL_ADMIN_PASSWORD || "Federal@2026!";
const FEDERAL_ADMIN_NAME = process.env.FEDERAL_ADMIN_NAME || "Federal System Administrator";

async function main() {
    console.log("=========================================");
    console.log("🌱 Starting EduBridge Official Seed Process...");
    console.log("=========================================");

    // 1. Seed Default System Roles
    const defaultRoles = [
        { name: "ADMIN", desc: "System Super Administrator" },
        { name: "SCHOOL_ADMIN", desc: "School Administrator / Principal" },
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
    console.log(`✅ System roles verified: ${defaultRoles.map(r => r.name).join(", ")}`);

    // 2. Seed System Administrative Permissions
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
        { name: "ASSESSMENT:GRADE", desc: "Grade Assessments" },
        { name: "OPERATIONAL:VIEW", desc: "View School Resources and Operations" },
        { name: "OPERATIONAL:CREATE", desc: "Create School Resources and Improvement Plans" },
        { name: "OPERATIONAL:UPDATE", desc: "Update School Resources and Plans" },
        { name: "OPERATIONAL:DELETE", desc: "Delete School Resources" },
        { name: "ISSUE:VIEW", desc: "View School Infrastructure Issues" },
        { name: "ISSUE:CREATE", desc: "Report Infrastructure Issues" },
        { name: "ISSUE:UPDATE", desc: "Update Infrastructure Issue Status" },
        { name: "COMMUNICATION:VIEW", desc: "View Announcements, Notices, Messages, and Notifications" },
        { name: "COMMUNICATION:CREATE", desc: "Create Announcements, Notices, and send Messages" },
        { name: "COMMUNICATION:MANAGE", desc: "Manage and delete Communication records" }
    ];

    const adminRoles = ["SCHOOL_ADMIN", "ADMIN"];
    for (const roleName of adminRoles) {
        for (const p of permissions) {
            await assignPermissionToRole(roleName, p.name, p.desc);
        }
    }

    const teacherPermissions = [
        "ACADEMIC:VIEW",
        "TEACHER:VIEW", "STUDENT:VIEW", "STUDENT:CREATE", "STUDENT:ENROLL",
        "ATTENDANCE:VIEW", "ATTENDANCE:RECORD",
        "ASSESSMENT:VIEW", "ASSESSMENT:CREATE", "ASSESSMENT:GRADE",
        "OPERATIONAL:VIEW", "OPERATIONAL:CREATE",
        "ISSUE:VIEW", "ISSUE:CREATE",
        "COMMUNICATION:VIEW", "COMMUNICATION:CREATE"
    ];
    for (const permName of teacherPermissions) {
        const found = permissions.find(p => p.name === permName);
        if (found) {
            await assignPermissionToRole("TEACHER", found.name, found.desc);
        }
    }

    const vicePrincipalPermissions = [
        "ACADEMIC:VIEW", "ACADEMIC:CREATE", "ACADEMIC:UPDATE", "ACADEMIC:MANAGE",
        "TEACHER:VIEW", "STUDENT:VIEW",
        "ATTENDANCE:VIEW", "ASSESSMENT:VIEW",
        "SCHOOL:VIEW", "OPERATIONAL:VIEW",
        "ISSUE:VIEW",
        "COMMUNICATION:VIEW", "COMMUNICATION:CREATE", "COMMUNICATION:MANAGE"
    ];
    for (const permName of vicePrincipalPermissions) {
        const found = permissions.find(p => p.name === permName);
        if (found) {
            await assignPermissionToRole("VICE_PRINCIPAL", found.name, found.desc);
        }
    }

    const studentParentPermissions = [
        "COMMUNICATION:VIEW", "COMMUNICATION:CREATE"
    ];
    for (const permName of studentParentPermissions) {
        const found = permissions.find(p => p.name === permName);
        if (found) {
            await assignPermissionToRole("STUDENT", found.name, found.desc);
            await assignPermissionToRole("PARENT", found.name, found.desc);
        }
    }

    console.log(`✅ System permissions mapped and synchronized.`);

    // 3. Ensure Root Federal Organization Unit Exists
    let federalUnit = await prisma.organizationUnit.findFirst({ where: { type: "FEDERAL" } });
    if (!federalUnit) {
        federalUnit = await prisma.organizationUnit.create({
            data: { name: "Federal Ministry of Education", type: "FEDERAL", parentId: null }
        });
        console.log(`✅ Created root Federal Organization Unit: ${federalUnit.name}`);
    } else {
        console.log(`✅ Root Federal Organization Unit verified: ${federalUnit.name}`);
    }

    // 4. Ensure ADMIN Role Exists for Assignment
    const adminRole = await prisma.role.findFirst({ where: { name: "ADMIN" } });
    if (!adminRole) {
        throw new Error("ADMIN role not found.");
    }

    // 5. Seed / Verify Official Federal Administrator Account
    let fedUser = await prisma.user.findUnique({ where: { email: FEDERAL_ADMIN_EMAIL } });

    if (!fedUser) {
        console.log(`🛠️ Creating Federal Admin account (${FEDERAL_ADMIN_EMAIL})...`);
        const hashedPassword = await hashPassword(FEDERAL_ADMIN_PASSWORD);
        const userId = "fed_admin_" + Date.now().toString(36);

        fedUser = await prisma.user.create({
            data: {
                id: userId,
                name: FEDERAL_ADMIN_NAME,
                email: FEDERAL_ADMIN_EMAIL,
                emailVerified: true,
                isActive: true,
                requiresPasswordChange: false
            }
        });

        await prisma.account.create({
            data: {
                id: "acc_fed_" + Date.now().toString(36),
                userId: fedUser.id,
                accountId: fedUser.id,
                providerId: "credential",
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        await prisma.roleAssignment.create({
            data: {
                userId: fedUser.id,
                roleId: adminRole.id,
                scopeId: federalUnit.id
            }
        });

        console.log(`✅ Federal Administrator account created with full national governance scope.`);
    } else {
        // Ensure role assignment exists at Federal scope
        const existingAssignment = await prisma.roleAssignment.findFirst({
            where: {
                userId: fedUser.id,
                roleId: adminRole.id,
                scopeId: federalUnit.id
            }
        });

        if (!existingAssignment) {
            await prisma.roleAssignment.create({
                data: {
                    userId: fedUser.id,
                    roleId: adminRole.id,
                    scopeId: federalUnit.id
                }
            });
        }
        console.log(`ℹ️ Federal Administrator (${FEDERAL_ADMIN_EMAIL}) verified.`);
    }

    console.log("=========================================");
    console.log("🎉 SEED COMPLETED SUCCESSFULLY!");
    console.log(`👤 Official Federal Admin : ${FEDERAL_ADMIN_EMAIL}`);
    console.log(`🔑 Initial Password       : ${FEDERAL_ADMIN_PASSWORD}`);
    console.log("=========================================");
}

main()
    .catch((err) => {
        console.error("❌ Error during seed process:", err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());