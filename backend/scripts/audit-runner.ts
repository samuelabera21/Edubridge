import fs from 'fs';
import path from 'path';
import { prisma } from '../src/infrastructure/prisma/client.js';

const API_BASE = "http://localhost:5001/api";

export const testData = {
    organizationId: "",
    userId: "",
    adminToken: "",
    teacherToken: "",
    studentToken: "",
    teacherId: "",
    studentId: "",
    academicYearId: "",
    gradeId: "",
    schoolGradeId: "",
    sectionId: "",
    issueId: ""
};

export async function seedData() {
    console.log("Seeding base test data...");
    
    // Create Organization
    const org = await prisma.organizationUnit.create({
        data: {
            name: "Audit Test School",
            type: "SCHOOL"
        }
    });
    testData.organizationId = org.id;

    // Create Academic Year
    const year = await prisma.academicYear.create({
        data: {
            organizationId: org.id,
            name: "2026/2027",
            startDate: new Date("2026-09-01"),
            endDate: new Date("2027-06-30"),
            status: "ACTIVE"
        }
    });
    testData.academicYearId = year.id;

    // Create Grade and SchoolGrade
    const grade = await prisma.grade.create({
        data: { name: "Grade 10", level: 10, organizationId: org.id }
    });
    testData.gradeId = grade.id;

    const schoolGrade = await prisma.schoolGrade.create({
        data: {
            academicYearId: year.id,
            gradeId: grade.id
        }
    });
    testData.schoolGradeId = schoolGrade.id;

    // Create Admin User via Auth API
    console.log("Creating Admin User via Auth API...");
    const adminEmail = `admin_audit_${Date.now()}@test.com`;
    let adminRes = await fetch(`${API_BASE}/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:5001' },
        body: JSON.stringify({ email: adminEmail, password: "Password123!" })
    });
    if (!adminRes.ok) {
        adminRes = await fetch(`${API_BASE}/auth/sign-up/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:5001' },
            body: JSON.stringify({ email: adminEmail, password: "Password123!", name: "Admin User" })
        });
    }
    testData.adminToken = adminRes.headers.get('set-cookie') || "";
    const userInDb = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (userInDb) {
        testData.userId = userInDb.id;
        const role = await prisma.role.upsert({ where: { name: "SCHOOL_ADMIN" }, update: {}, create: { name: "SCHOOL_ADMIN", description: "Admin" } });
        await prisma.roleAssignment.upsert({
            where: { userId_roleId_scopeId: { userId: testData.userId, roleId: role.id, scopeId: testData.organizationId } },
            update: {},
            create: { userId: testData.userId, roleId: role.id, scopeId: testData.organizationId }
        });
    }

    // Create Teacher
    const teacherEmail = `teacher_audit_${Date.now()}@test.com`;
    let teacherRes = await fetch(`${API_BASE}/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:5001' },
        body: JSON.stringify({ email: teacherEmail, password: "Password123!" })
    });
    if (!teacherRes.ok) {
        teacherRes = await fetch(`${API_BASE}/auth/sign-up/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:5001' },
            body: JSON.stringify({ email: teacherEmail, password: "Password123!", name: "Teacher User" })
        });
    }
    testData.teacherToken = teacherRes.headers.get('set-cookie') || "";
    const teacherInDb = await prisma.user.findUnique({ where: { email: teacherEmail } });
    if (teacherInDb) {
        testData.teacherId = teacherInDb.id;
        const teacherRole = await prisma.role.upsert({ where: { name: "TEACHER" }, update: {}, create: { name: "TEACHER" } });
        await prisma.roleAssignment.upsert({
            where: { userId_roleId_scopeId: { userId: testData.teacherId, roleId: teacherRole.id, scopeId: testData.organizationId } },
            update: {},
            create: { userId: testData.teacherId, roleId: teacherRole.id, scopeId: testData.organizationId }
        });
    }

    // Create Student
    const studentEmail = `student_audit_${Date.now()}@test.com`;
    let studentRes = await fetch(`${API_BASE}/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:5001' },
        body: JSON.stringify({ email: studentEmail, password: "Password123!" })
    });
    if (!studentRes.ok) {
        studentRes = await fetch(`${API_BASE}/auth/sign-up/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:5001' },
            body: JSON.stringify({ email: studentEmail, password: "Password123!", name: "Student User" })
        });
    }
    testData.studentToken = studentRes.headers.get('set-cookie') || "";
    const studentInDb = await prisma.user.findUnique({ where: { email: studentEmail } });
    if (studentInDb) {
        testData.studentId = studentInDb.id;
        const studentRole = await prisma.role.upsert({ where: { name: "STUDENT" }, update: {}, create: { name: "STUDENT" } });
        await prisma.roleAssignment.upsert({
            where: { userId_roleId_scopeId: { userId: testData.studentId, roleId: studentRole.id, scopeId: testData.organizationId } },
            update: {},
            create: { userId: testData.studentId, roleId: studentRole.id, scopeId: testData.organizationId }
        });
    }
    console.log("Seeding complete.");
}

async function runAudit() {
    try {
        await seedData();
        
        // Fetch swagger definition
        const swaggerRes = await fetch(`${API_BASE}/openapi.json`);
        const swagger = await swaggerRes.json();
        const paths = Object.keys(swagger.paths);
        console.log(`Found ${paths.length} documented paths.`);
        
        const docPath = path.join(process.cwd(), '../Docs/architecture/school-domain');
        let reportMd = `# FOUNDATION API AUDIT REPORT\n\n`;
        reportMd += `Total documented paths: ${paths.length}\n`;
        
        fs.writeFileSync(path.join(docPath, 'FOUNDATION_API_AUDIT_REPORT.md'), reportMd);
        
        console.log("Audit complete. Reports generated.");
    } catch (e) {
        console.error(e);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    runAudit().catch(console.error);
}
