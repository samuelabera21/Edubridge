"use client";

import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Loader2, BookOpen, LogOut, LayoutDashboard, Building, Search, Lock, ChevronDown, ChevronRight, Calendar, Users, GraduationCap, ClipboardCheck, FileText, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { authData, loading, error } = useAuth(true);
    const pathname = usePathname();
    const router = useRouter();

    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        academics: pathname.startsWith("/dashboard/academics"),
        students: pathname.startsWith("/dashboard/students"),
        teachers: pathname.startsWith("/dashboard/teachers"),
        attendance: pathname.startsWith("/dashboard/attendance"),
    });

    const toggleMenu = (key: string) => {
        setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] text-gray-700">
                <Loader2 className="h-8 w-8 animate-spin text-[#006b3f] mr-3" />
                <span className="text-lg font-medium">Verifying access...</span>
            </div>
        );
    }

    if (error || !authData) {
        return null;
    }

    const primaryAccess = authData.access[0];
    const roleName = primaryAccess?.role?.name || "Unassigned";

    const handleLogout = async () => {
        try {
            await fetchApi("/auth/sign-out", { method: "POST" });
            router.push("/login");
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    const isLinkActive = (path: string) => pathname.startsWith(path);

    return (
        <div className="min-h-screen flex flex-col bg-[#f4f5f7] font-sans">
            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 z-10">
                <div className="flex items-center space-x-2">
                    <div className="text-blue-500">
                        {/* Placeholder for Logo, using an icon for now */}
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 7l10 5 10-5-10-5zm0 7.5L4.5 7 12 4.25 19.5 7 12 9.5zM2 12l10 5 10-5v5l-10 5-10-5v-5z"/>
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-orange-500 tracking-tight">Edu<span className="text-blue-500">Bridge</span></span>
                </div>

                <div className="hidden md:flex items-center space-x-6">
                    <nav className="flex space-x-6 text-sm font-bold text-gray-700">
                        <Link href="/dashboard" className="flex items-center hover:text-[#006b3f] transition-colors"><Building className="w-4 h-4 mr-1"/> About</Link>
                        <Link href="/dashboard" className="flex items-center hover:text-[#006b3f] transition-colors"><LayoutDashboard className="w-4 h-4 mr-1"/> Dashboard</Link>
                        <Link href="/dashboard/school/profile" className="flex items-center hover:text-[#006b3f] transition-colors">School Profile</Link>
                        <Link href="/dashboard/academics/years" className="flex items-center hover:text-[#006b3f] transition-colors">Academics</Link>
                        <Link href="#" className="flex items-center hover:text-[#006b3f] transition-colors"><Lock className="w-4 h-4 ml-1"/></Link>
                    </nav>
                    
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search ..." 
                            className="bg-gray-100 border-none text-sm rounded-md pl-4 pr-10 py-1.5 focus:ring-2 focus:ring-[#006b3f] outline-none w-64"
                        />
                        <Search className="absolute right-3 top-2 h-4 w-4 text-gray-400" />
                    </div>

                    <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 transition-colors" title="Logout">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex overflow-y-auto">
                    <div className="p-4 pt-6">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-4 px-2">Navigation</p>
                        
                        <nav className="space-y-1">
                            {roleName === "SCHOOL_ADMIN" && (
                                <>
                                    <Link 
                                        href="/dashboard/admin" 
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${pathname === "/dashboard/admin" ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <LayoutDashboard className="w-4 h-4 text-gray-500" />
                                            <span>Dashboard</span>
                                        </div>
                                    </Link>

                                    <Link 
                                        href="/dashboard/school/profile" 
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${pathname === "/dashboard/school/profile" ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <Building className="w-4 h-4 text-gray-500" />
                                            <span>School Profile</span>
                                        </div>
                                    </Link>

                                    {/* Academics Group */}
                                    <div className="pt-2">
                                        <button 
                                            onClick={() => toggleMenu("academics")}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <Calendar className="w-4 h-4 text-gray-500" />
                                                <span>Academics</span>
                                            </div>
                                            {openMenus.academics ? 
                                                <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                            }
                                        </button>
                                        {openMenus.academics && (
                                            <div className="pl-10 pr-3 py-1 space-y-1">
                                                <Link href="/dashboard/academics/years" className={`block py-1.5 text-sm ${pathname === "/dashboard/academics/years" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Academic Years</Link>
                                                <Link href="/dashboard/academics/grades" className={`block py-1.5 text-sm ${pathname.startsWith("/dashboard/academics/grades") ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Grades & Sections</Link>
                                                <Link href="#" className="block py-1.5 text-sm text-gray-400 cursor-not-allowed">Subjects</Link>
                                                <Link href="#" className="block py-1.5 text-sm text-gray-400 cursor-not-allowed">Timetable</Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Students Group */}
                                    <div className="pt-1">
                                        <button 
                                            onClick={() => toggleMenu("students")}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <Users className="w-4 h-4 text-gray-500" />
                                                <span>Students</span>
                                            </div>
                                            {openMenus.students ? 
                                                <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                            }
                                        </button>
                                        {openMenus.students && (
                                            <div className="pl-10 pr-3 py-1 space-y-1">
                                                <Link href="/dashboard/students" className={`block py-1.5 text-sm ${pathname === "/dashboard/students" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Students</Link>
                                                <Link href="/dashboard/students/enrollments" className={`block py-1.5 text-sm ${pathname.startsWith("/dashboard/students/enrollments") ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Enrollments</Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Teachers Group */}
                                    <div className="pt-1">
                                        <button 
                                            onClick={() => toggleMenu("teachers")}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <GraduationCap className="w-4 h-4 text-gray-500" />
                                                <span>Teachers</span>
                                            </div>
                                            {openMenus.teachers ? 
                                                <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                            }
                                        </button>
                                        {openMenus.teachers && (
                                            <div className="pl-10 pr-3 py-1 space-y-1">
                                                <Link href="#" className="block py-1.5 text-sm text-gray-400 cursor-not-allowed">Teachers</Link>
                                                <Link href="#" className="block py-1.5 text-sm text-gray-400 cursor-not-allowed">Assignments</Link>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Additional generic placeholder groups for UI fidelity */}
                                    <div className="pt-1">
                                        <button 
                                            onClick={() => toggleMenu("attendance")}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <ClipboardCheck className="w-4 h-4 text-gray-500" />
                                                <span>Attendance</span>
                                            </div>
                                            {openMenus.attendance ? 
                                                <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                            }
                                        </button>
                                        {openMenus.attendance && (
                                            <div className="pl-10 pr-3 py-1 space-y-1">
                                                <Link href="#" className="block py-1.5 text-sm text-gray-400 cursor-not-allowed">Student Attendance</Link>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </nav>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col overflow-y-auto">
                    {/* Dark Green Banner */}
                    <div className="bg-[#006b3f] text-white px-8 py-5">
                        <h1 className="text-2xl font-bold tracking-wide">The hub for quality education in Ethiopia</h1>
                    </div>
                    
                    {/* Page Content Padding */}
                    <div className="p-6 md:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
