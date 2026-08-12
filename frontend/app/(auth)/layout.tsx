import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex font-sans bg-white">
            {/* Left Side: Image / Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-[#4085b3]">
                <Image
                    src="/1.png"
                    alt="Education campus"
                    fill
                    className="object-cover object-center"
                    priority
                />

                {/* Clean gradient just to make text legible, not muddying the whole image */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#4085b3]/90 via-[#4085b3]/30 to-transparent"></div>

                <div className="relative z-10 flex flex-col justify-between p-12 h-full text-white animate-fade-in">
                    <Link href="/" className="flex items-center space-x-3 w-max">
                        <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm border border-white/30">
                            <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">EduBridge</span>
                    </Link>

                    <div className="mb-10 opacity-0 animate-[fade-in-up_1s_ease-out_0.3s_forwards]">
                        <h2 className="text-4xl font-semibold mb-4 text-white drop-shadow-md">Empowering Education</h2>
                        <p className="text-lg text-sky-50 max-w-md leading-relaxed drop-shadow">
                            A centralized, secure platform to manage institutional records, academic progress, and organizational hierarchy seamlessly.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side: Auth Forms */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-24 relative">
                {/* Mobile Header */}
                <div className="lg:hidden absolute top-8 left-8">
                    <Link href="/" className="flex items-center space-x-3">
                        <div className="bg-[#4085b3] p-1.5 rounded-full">
                            <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900 tracking-tight">EduBridge</span>
                    </Link>
                </div>

                <div className="w-full max-w-md animate-slide-in-right">
                    {children}
                </div>
            </div>
        </div>
    );
}
