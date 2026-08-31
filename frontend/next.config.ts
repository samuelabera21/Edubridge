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
