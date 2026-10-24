import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async redirects() {
        return [
            {
                source: "/teacher",
                destination: "/dashboard/teacher",
                permanent: false,
            },
            {
                source: "/teacher/:path*",
                destination: "/dashboard/teacher/:path*",
                permanent: false,
            },
            {
                source: "/dashboard/teacher/assessment",
                destination: "/dashboard/teacher",
                permanent: false,
            },
            {
                source: "/dashboard/teacher/assessment/:path*",
                destination: "/dashboard/teacher",
                permanent: false,
            },
            {
                source: "/dashboard/teacher/learning",
                destination: "/dashboard/teacher",
                permanent: false,
            },
            {
                source: "/dashboard/teacher/learning/:path*",
                destination: "/dashboard/teacher",
                permanent: false,
            },
            {
                source: "/dashboard/teacher/activities",
                destination: "/dashboard/teacher",
                permanent: false,
            },
            {
                source: "/dashboard/teacher/activities/:path*",
                destination: "/dashboard/teacher",
                permanent: false,
            },
            {
                source: "/dashboard/teacher/pd",
                destination: "/dashboard/teacher",
                permanent: false,
            },
            {
                source: "/dashboard/teacher/pd/:path*",
                destination: "/dashboard/teacher",
                permanent: false,
            },
        ];
    },
    async rewrites() {
        const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
        return [
            {
                source: "/api/:path*",
                destination: `${backendUrl}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
