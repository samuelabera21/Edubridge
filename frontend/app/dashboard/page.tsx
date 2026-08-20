import Link from "next/link";
import { BookOpen, Home } from "lucide-react";

export const metadata = {
    title: "404 — Page Not Found | EduBridge",
    description: "The page you are looking for does not exist.",
};

export default function DashboardNotFound() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-20 font-sans">

            {/* EduBridge Branding */}
            <div className="flex items-center space-x-2.5 mb-14">
                <div className="bg-sky-600 p-2 rounded-full shadow-sm">
                    <BookOpen className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900 tracking-tight">EduBridge</span>
            </div>

            {/* 404 Number */}
            <div className="relative mb-6 select-none">
                <span className="text-[9rem] sm:text-[12rem] font-black text-gray-100 leading-none tracking-tighter">
                    404
                </span>
                {/* Sky accent line under the number */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 h-1.5 w-24 rounded-full bg-sky-500 opacity-70" />
            </div>

            {/* Heading & Description */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3">
                Page Not Found
            </h1>
            <p className="text-sm sm:text-base text-gray-500 text-center max-w-md leading-relaxed mb-10">
                The page you&apos;re looking for doesn&apos;t exist or may have been moved.
            </p>

            {/* Return to Home button */}
            <Link
                href="/"
                className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-sm transition-colors duration-150"
            >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
            </Link>

        </div>
    );
}
