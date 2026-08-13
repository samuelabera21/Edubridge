import Image from "next/image";
import Link from "next/link";
import { BookOpen, Users, BarChart3, ShieldCheck, ArrowRight } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen flex flex-col font-sans bg-gray-50 text-gray-900">
            {/* Navbar */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center space-x-3">
                            <div className="bg-sky-600 p-1.5 rounded-full">
                                <BookOpen className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-900 tracking-tight">EduBridge</span>
                        </div>
                        <nav className="hidden md:flex space-x-8">
                            <Link href="#features" className="text-sm text-gray-600 hover:text-sky-700 font-medium transition-colors">Features</Link>
                            <Link href="#about" className="text-sm text-gray-600 hover:text-sky-700 font-medium transition-colors">About</Link>
                            <Link href="#contact" className="text-sm text-gray-600 hover:text-sky-700 font-medium transition-colors">Contact</Link>
                        </nav>
                        <div className="flex items-center space-x-4">
                            <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-sky-700 transition-colors">
                                Sign In
                            </Link>
                            <Link href="/register" className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 rounded font-medium text-sm transition-colors shadow-sm">
                                Register
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative w-full h-[600px] lg:h-[700px] flex flex-col lg:flex-row bg-[#4085b3]">

                {/* Left Side: Solid Blue Background with Text */}
                <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-16 lg:px-24 z-10 animate-fade-in-up">
                    <div className="mb-8 opacity-0 animate-[fade-in_1s_ease-out_0.2s_forwards]">
                        <div className="bg-white/10 inline-block p-3 rounded-full backdrop-blur-sm border border-white/20 mb-6">
                            <BookOpen className="h-8 w-8 text-white" />
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-semibold text-white leading-tight mb-6 tracking-wide opacity-0 animate-[fade-in-up_1s_ease-out_0.4s_forwards]">
                        Welcome to EduBridge <br />
                        <span className="text-sky-100 font-light">ትምህርት ለሁሉም!</span>
                    </h1>

                    <p className="text-lg text-sky-50 mb-10 max-w-lg leading-relaxed opacity-0 animate-[fade-in_1s_ease-out_0.6s_forwards]">
                        The official, secure platform connecting schools, regions, and the federal ministry to streamline education management across Ethiopia.
                    </p>

                    <div className="opacity-0 animate-[fade-in-up_1s_ease-out_0.8s_forwards]">
                        <Link href="/login" className="inline-block border-2 border-white text-white px-8 py-3 rounded hover:bg-white hover:text-[#4085b3] transition-all font-semibold uppercase tracking-wider text-sm shadow-md">
                            Get Started
                        </Link>
                    </div>
                </div>

                {/* Right Side: Clear Image */}
                <div className="w-full lg:w-[55%] h-full relative overflow-hidden animate-slide-in-right hidden lg:block">
                    <Image
                        src="/3.jpg"
                        alt="Students in classroom"
                        fill
                        className="object-cover object-center"
                        priority
                    />
                    {/* Add a subtle gradient only at the very edge to blend slightly if needed, or leave it hard-edged for a clean split */}
                    <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#4085b3] to-transparent"></div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-white">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 opacity-0 animate-[fade-in-up_1s_ease-out_1s_forwards]">
                        <h2 className="text-3xl font-semibold text-[#2c3e50] sm:text-4xl tracking-tight">Platform Capabilities</h2>
                        <div className="w-24 h-1 bg-[#4085b3] mx-auto mt-6 mb-4"></div>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Comprehensive administrative and academic tools designed for every level of the Ethiopian education hierarchy.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 opacity-0 animate-[fade-in-up_1s_ease-out_1.2s_forwards]">
                        {/* Feature 1 */}
                        <div className="bg-white border-t-4 border-[#4085b3] shadow-sm border-x border-b border-gray-100 p-8 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-sky-50 flex items-center justify-center mb-6">
                                <Users className="h-6 w-6 text-[#4085b3]" />
                            </div>
                            <h3 className="text-xl font-semibold text-[#2c3e50] mb-3">Hierarchical Access</h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                Secure, role-based access ensuring that school administrators, teachers, and officials only see the data they are authorized to manage.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white border-t-4 border-[#4085b3] shadow-sm border-x border-b border-gray-100 p-8 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-sky-50 flex items-center justify-center mb-6">
                                <BarChart3 className="h-6 w-6 text-[#4085b3]" />
                            </div>
                            <h3 className="text-xl font-semibold text-[#2c3e50] mb-3">Real-time Insights</h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                Live dashboards and reporting tools to monitor attendance, academic performance, and school profiles seamlessly.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white border-t-4 border-[#4085b3] shadow-sm border-x border-b border-gray-100 p-8 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-sky-50 flex items-center justify-center mb-6">
                                <ShieldCheck className="h-6 w-6 text-[#4085b3]" />
                            </div>
                            <h3 className="text-xl font-semibold text-[#2c3e50] mb-3">Enterprise Security</h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                Built on robust authentication and authorization foundations, guaranteeing strict data isolation between educational institutions.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#2c3e50] text-gray-300 py-16 mt-auto border-t-[8px] border-[#4085b3]">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="bg-white/10 p-1.5 rounded-full">
                                <BookOpen className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-2xl font-bold text-white tracking-tight">EduBridge</span>
                        </div>
                        <p className="text-sm leading-relaxed max-w-md text-gray-400">
                            The official platform for comprehensive education management. Bridging the gap between data and actionable educational insights across all regions.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-6 tracking-wide uppercase text-sm">Platform</h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><Link href="/login" className="hover:text-white transition-colors">Sign In Portal</Link></li>
                            <li><Link href="/register" className="hover:text-white transition-colors">Register Account</Link></li>
                            <li><Link href="#features" className="hover:text-white transition-colors">Capabilities</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-6 tracking-wide uppercase text-sm">Legal & Help</h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-gray-700/50 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                    <p>&copy; {new Date().getFullYear()} Ministry of Education - EduBridge Platform. All rights reserved.</p>
                    <p className="mt-4 md:mt-0">Powered by National Data Infrastructure</p>
                </div>
            </footer>
        </div>
    );
}
