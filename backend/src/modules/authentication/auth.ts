import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../../infrastructure/prisma/client.js";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001/api/auth",
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),

    emailAndPassword: {
        enabled: true,
    },

    trustedOrigins: [
        "http://localhost:5000",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:3001",
        "http://localhost:5001"
    ],
});