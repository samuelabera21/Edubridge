import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../../infrastructure/prisma/client.js";
import { sendPasswordResetEmail } from "../email/email.service.js";

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
        },
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