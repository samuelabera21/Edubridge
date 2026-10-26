"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Users, BarChart3, ShieldCheck, ArrowUp, Menu, X } from "lucide-react";

export default function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    return (
        <div className="min-h-screen flex flex-col font-sans bg-gray-50 text-gray-900 scroll-smooth">
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

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex space-x-8">
                            <Link href="#features" className="text-sm text-gray-600 hover:text-sky-700 font-medium transition-colors">Features</Link>
                            <Link href="#about" className="text-sm text-gray-600 hover:text-sky-700 font-medium transition-colors">About</Link>
                            <Link href="#contact" className="text-sm text-gray-600 hover:text-sky-700 font-medium transition-colors">Contact</Link>
                        </nav>

                        {/* Desktop Actions */}
                        <div className="hidden md:flex items-center space-x-4">
                            <Link href="/login" className="bg-[#4085b3] hover:bg-[#32698e] text-white px-5 py-2 rounded-lg font-medium text-sm transition-all shadow-sm">
                                Sign In
                            </Link>
                        </div>

                        {/* Mobile Hamburger Button */}
                        <div className="flex md:hidden items-center space-x-2">
                            <Link href="/login" className="bg-[#4085b3] hover:bg-[#32698e] text-white px-3.5 py-1.5 rounded-lg font-medium text-xs transition-all shadow-sm">
                                Sign In
                            </Link>
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Dropdown Nav */}
                    {mobileMenuOpen && (
                        <div className="md:hidden border-t border-gray-100 py-4 px-2 space-y-3 bg-white animate-in fade-in slide-in-from-top-2 duration-150">
                            <Link
                                href="#features"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block px-3 py-2 text-sm text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                            >
                                Features
                            </Link>
                            <Link
                                href="#about"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block px-3 py-2 text-sm text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                            >
                                About
                            </Link>
                            <Link
                                href="#contact"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block px-3 py-2 text-sm text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                            >
                                Contact
                            </Link>
                            <div className="pt-2">
                                <Link
                                    href="/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block w-full text-center bg-[#4085b3] hover:bg-[#32698e] text-white py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm"
                                >
                                    Sign In to EduBridge
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative w-full min-h-[500px] lg:h-[700px] flex flex-col lg:flex-row bg-[#4085b3]">
                {/* Left Side: Solid Blue Background with Text */}
                <div className="w-full lg:w-[45%] flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 lg:py-0 z-10 animate-fade-in-up">
                    <div className="mb-6 opacity-0 animate-[fade-in_1s_ease-out_0.2s_forwards]">
                        <div className="bg-white/10 inline-block p-3 rounded-full backdrop-blur-sm border border-white/20 mb-4 sm:mb-6">
                            <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                        </div>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white leading-tight mb-4 sm:mb-6 tracking-wide opacity-0 animate-[fade-in-up_1s_ease-out_0.4s_forwards]">
                        Welcome to EduBridge <br />
                        <span className="text-sky-100 font-light text-2xl sm:text-3xl md:text-4xl">ትምህርት ለሁሉም!</span>
                    </h1>

                    <p className="text-base sm:text-lg text-sky-50 mb-8 max-w-lg leading-relaxed opacity-0 animate-[fade-in_1s_ease-out_0.6s_forwards]">
                        The official, secure platform connecting schools, regions, and the federal ministry to streamline education management across Ethiopia.
                    </p>

                    {/* Mobile Get Started Button (Visible on mobile/tablet screens) */}
                    <div className="lg:hidden opacity-0 animate-[fade-in-up_1s_ease-out_0.8s_forwards]">
                        <Link
                            href="/login"
                            className="inline-block border-2 border-white text-white px-8 py-3 rounded-lg hover:bg-white hover:text-[#4085b3] transition-all font-semibold uppercase tracking-wider text-sm shadow-md"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>

                {/* Right Side: Clear Image with Get Started button in top right marked position */}
                <div className="w-full lg:w-[55%] h-full relative overflow-hidden animate-slide-in-right hidden lg:block">
                    <Image
                        src="/3.jpg"
                        alt="Students in classroom"
                        fill
                        sizes="(max-width: 1024px) 100vw, 55vw"
                        className="object-cover object-center"
                        priority
                    />
                    {/* Soft gradient edge */}
                    <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#4085b3] to-transparent pointer-events-none"></div>

                    {/* Get Started Button placed in the upper-right area marked by user */}
                    <div className="absolute top-20 right-14 xl:right-20 z-20 opacity-0 animate-[fade-in-up_1s_ease-out_0.8s_forwards]">
                        <Link
                            href="/login"
                            className="inline-block border-2 border-white text-white px-8 py-3 rounded-lg hover:bg-white hover:text-[#4085b3] transition-all font-semibold uppercase tracking-wider text-sm shadow-xl bg-black/15 backdrop-blur-xs hover:shadow-2xl"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-16 sm:py-24 bg-white">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 sm:mb-16 opacity-0 animate-[fade-in-up_1s_ease-out_1s_forwards]">
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#2c3e50] tracking-tight">Platform Capabilities</h2>
                        <div className="w-20 sm:w-24 h-1 bg-[#4085b3] mx-auto mt-4 sm:mt-6 mb-4"></div>
                        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-2">
                            Comprehensive administrative and academic tools designed for every level of the Ethiopian education hierarchy.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 opacity-0 animate-[fade-in-up_1s_ease-out_1.2s_forwards]">
                        {/* Feature 1 */}
                        <div className="bg-white border-t-4 border-[#4085b3] shadow-sm border-x border-b border-gray-100 p-6 sm:p-8 hover:shadow-md transition-shadow rounded-b-lg">
                            <div className="w-12 h-12 bg-sky-50 flex items-center justify-center mb-6 rounded-lg">
                                <Users className="h-6 w-6 text-[#4085b3]" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-semibold text-[#2c3e50] mb-3">Hierarchical Access</h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                Secure, role-based access ensuring that school administrators, teachers, and officials only see the data they are authorized to manage.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white border-t-4 border-[#4085b3] shadow-sm border-x border-b border-gray-100 p-6 sm:p-8 hover:shadow-md transition-shadow rounded-b-lg">
                            <div className="w-12 h-12 bg-sky-50 flex items-center justify-center mb-6 rounded-lg">
                                <BarChart3 className="h-6 w-6 text-[#4085b3]" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-semibold text-[#2c3e50] mb-3">Real-time Insights</h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                Live dashboards and reporting tools to monitor attendance, academic performance, and school profiles seamlessly.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white border-t-4 border-[#4085b3] shadow-sm border-x border-b border-gray-100 p-6 sm:p-8 hover:shadow-md transition-shadow rounded-b-lg">
                            <div className="w-12 h-12 bg-sky-50 flex items-center justify-center mb-6 rounded-lg">
                                <ShieldCheck className="h-6 w-6 text-[#4085b3]" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-semibold text-[#2c3e50] mb-3">Enterprise Security</h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                Built on robust authentication and authorization foundations, guaranteeing strict data isolation between educational institutions.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* About / System Section */}
            <section id="about" className="py-16 sm:py-20 bg-gray-50 border-t border-gray-200">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                        <div className="space-y-4">
                            <span className="text-xs uppercase font-bold tracking-wider text-[#4085b3] bg-sky-50 px-2.5 py-1 rounded border border-sky-100">
                                National Infrastructure
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                                Unified Governance Across Every Administrative Tier
                            </h2>
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                EduBridge synchronizes educational metrics from Federal down to School classrooms. Administrative units collaborate with real-time dashboards, official directives, and standardized EMIS reporting.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                                <p className="text-2xl sm:text-3xl font-extrabold text-[#4085b3]">Federal</p>
                                <p className="text-xs text-gray-500 mt-1">Ministry Oversight & Policy Directives</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                                <p className="text-2xl sm:text-3xl font-extrabold text-[#4085b3]">Regions</p>
                                <p className="text-xs text-gray-500 mt-1">Regional Bureau Administration</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                                <p className="text-2xl sm:text-3xl font-extrabold text-[#4085b3]">Zones & Woredas</p>
                                <p className="text-xs text-gray-500 mt-1">District Supervision & Verification</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                                <p className="text-2xl sm:text-3xl font-extrabold text-[#4085b3]">Schools</p>
                                <p className="text-xs text-gray-500 mt-1">Teachers, Students & Parents</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-16 sm:py-20 bg-white border-t border-gray-200">
                <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Institutional Access & Support</h2>
                    <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto leading-relaxed">
                        Accounts and administrative jurisdictions are provisioned centrally by educational authorities. For support or credentials assistance, please contact your designated institutional administrator.
                    </p>
                    <div className="pt-2">
                        <Link
                            href="/login"
                            className="inline-block bg-[#4085b3] hover:bg-[#32698e] text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm"
                        >
                            Sign In to Portal
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#2c3e50] text-gray-300 py-12 sm:py-16 mt-auto border-t-[8px] border-[#4085b3] relative">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
                    <div className="col-span-1 sm:col-span-2">
                        <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                            <div className="bg-white/10 p-1.5 rounded-full">
                                <BookOpen className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">EduBridge</span>
                        </div>
                        <p className="text-xs sm:text-sm leading-relaxed max-w-md text-gray-400">
                            The official platform for comprehensive education management. Bridging the gap between data and actionable educational insights across all regions.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4 sm:mb-6 tracking-wide uppercase text-xs sm:text-sm">Platform</h4>
                        <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-gray-400">
                            <li><Link href="/login" className="hover:text-white transition-colors">Sign In Portal</Link></li>
                            <li><Link href="#features" className="hover:text-white transition-colors">Capabilities</Link></li>
                            <li><Link href="#about" className="hover:text-white transition-colors">Institutional Architecture</Link></li>
                        </ul>
                    </div>

                    <div className="flex flex-col justify-between">
                        <div>
                            <h4 className="text-white font-semibold mb-4 sm:mb-6 tracking-wide uppercase text-xs sm:text-sm">Legal & Help</h4>
                            <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-gray-400">
                                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
                            </ul>
                        </div>

                        {/* Blue Return to Top Button placed at bottom right as requested */}
                        <div className="pt-6 sm:pt-4 flex items-center justify-start sm:justify-end">
                            <button
                                type="button"
                                onClick={scrollToTop}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer group"
                                title="Return to top"
                                aria-label="Return to top"
                            >
                                <span>Back to top</span>
                                <ArrowUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 sm:pt-8 border-t border-gray-700/50 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 gap-3">
                    <p>&copy; {new Date().getFullYear()} Ministry of Education - EduBridge Platform. All rights reserved.</p>
                    <p>Powered by National Data Infrastructure</p>
                </div>
            </footer>

            {/* Floating Blue Scroll-to-Top Button when scrolled */}
            {showScrollTop && (
                <button
                    type="button"
                    onClick={scrollToTop}
                    className="fixed bottom-6 right-6 z-40 p-3 bg-[#4085b3] hover:bg-[#32698e] text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 cursor-pointer flex items-center justify-center animate-fade-in"
                    title="Return to top"
                    aria-label="Return to top"
                >
                    <ArrowUp className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}
