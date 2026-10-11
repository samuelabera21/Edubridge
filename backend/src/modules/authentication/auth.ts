import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../../infrastructure/prisma/client.js";
import { sendPasswordResetEmail } from "../email/email.service.js";
import { assignRoleToUserByScopeId } from "./authorization.service.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3001";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001/api/auth",
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),

    emailAndPassword: {
        enabled: true,
        resetPasswordTokenExpiresIn: 3600, // 1 hour
        sendResetPassword: async ({ user, url, token }) => {
            const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
            await sendPasswordResetEmail({
                recipientEmail: user.email,
                recipientName: user.name || "EduBridge User",
                resetUrl,
                token,
                expiryHours: 1,
            });
        },
    },

    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            redirectURI: process.env.GOOGLE_AUTH_CALLBACK_URL || "http://localhost:3001/api/auth/callback/google",
        },
    },

    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    try {
                        const email = user.email.toLowerCase();
                        // 1. Check if an unlinked Teacher matches this email
                        const matchedTeacher = await prisma.teacher.findFirst({
                            where: {
                                email: { equals: email, mode: "insensitive" },
                                userId: null
                            }
                        });
                        if (matchedTeacher) {
                            await prisma.teacher.update({
                                where: { id: matchedTeacher.id },
                                data: { userId: user.id }
                            });
                            if (matchedTeacher.organizationId) {
                                await assignRoleToUserByScopeId(user.id, "TEACHER", matchedTeacher.organizationId);
                            }
                            return;
                        }

                        // 2. Check if an unlinked Student matches by studentId prefix
                        const studentIdCandidate = email.split("@")[0];
                        const matchedStudent = await prisma.student.findFirst({
                            where: {
                                studentId: { equals: studentIdCandidate, mode: "insensitive" },
                                userId: null
                            },
                            include: { enrollments: true }
                        });
                        if (matchedStudent) {
                            await prisma.student.update({
                                where: { id: matchedStudent.id },
                                data: { userId: user.id }
                            });
                            const orgId = matchedStudent.enrollments?.[0]?.organizationId;
                            if (orgId) {
                                await assignRoleToUserByScopeId(user.id, "STUDENT", orgId);
                            }
                            return;
                        }

                        // 3. Check if an unlinked Parent matches this email
                        const matchedParent = await prisma.parent.findFirst({
                            where: {
                                email: { equals: email, mode: "insensitive" },
                                userId: null
                            }
                        });
                        if (matchedParent) {
                            await prisma.parent.update({
                                where: { id: matchedParent.id },
                                data: { userId: user.id }
                            });
                            const linkedChild = await prisma.parentStudent.findFirst({
                                where: { parentId: matchedParent.id },
                                include: {
                                    student: {
                                        include: { enrollments: true }
                                    }
                                }
                            });
                            const orgId = linkedChild?.student?.enrollments?.[0]?.organizationId;
                            if (orgId) {
                                await assignRoleToUserByScopeId(user.id, "PARENT", orgId);
                            }
                            return;
                        }
                    } catch (hookErr) {
                        console.error("[BetterAuth] User creation hook error:", hookErr);
                    }
                }
            }
        }
    },

    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ["google"],
        },
    },

    trustedOrigins: [
        "http://localhost:5000",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:3001",
        "http://localhost:5001"
    ],
});