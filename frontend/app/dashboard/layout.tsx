"use client";

import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Loader2, BookOpen, LogOut, LayoutDashboard, Building, Search, Lock, ChevronDown, ChevronRight, Calendar, Users, GraduationCap, ClipboardCheck, FileText, Settings, User, Megaphone, Bell, MessageSquare, Package, AlertOctagon, TrendingUp, HeartHandshake, BarChart2, Sparkles, Menu } from "lucide-react";
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
        assessment: pathname.startsWith("/dashboard/assessment"),
        learning: pathname.startsWith("/dashboard/learning"),
        parents: pathname.startsWith("/dashboard/parents"),
        communication: pathname.startsWith("/dashboard/communication"),
        operations: pathname.startsWith("/dashboard/operations"),
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
    const isTeacherRoute = pathname.startsWith("/dashboard/teacher") || roleName === "TEACHER";

    const handleLogout = async () => {
        try {
            await fetchApi("/auth/sign-out", { method: "POST" });
            router.push("/login");
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-[#f4f5f7] font-sans">
            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 z-10">
                <div className="flex items-center space-x-3">
                    {isTeacherRoute ? (
                        <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold">
                                <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-extrabold text-blue-900 tracking-tight">Edu<span className="text-blue-600">Bridge</span></span>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-2">
                            <div className="text-[#006b3f]">
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zm0 7.5L4.5 7 12 4.25 19.5 7 12 9.5zM2 12l10 5 10-5v5l-10 5-10-5v-5z"/>
                                </svg>
                            </div>
                            <span className="text-xl font-bold text-orange-500 tracking-tight">Edu<span className="text-[#006b3f]">Bridge</span></span>
                        </div>
                    )}
                </div>

                <div className="hidden md:flex items-center space-x-5">
                    {!isTeacherRoute && (
                        <nav className="flex space-x-6 text-sm font-bold text-gray-700 mr-4">
                            <Link href="/dashboard" className="flex items-center hover:text-[#006b3f] transition-colors"><Building className="w-4 h-4 mr-1"/> About</Link>
                            <Link href="/dashboard" className="flex items-center hover:text-[#006b3f] transition-colors"><LayoutDashboard className="w-4 h-4 mr-1"/> Dashboard</Link>
                            <Link href="/dashboard/school/profile" className="flex items-center hover:text-[#006b3f] transition-colors">School Profile</Link>
                            <Link href="/dashboard/academics/years" className="flex items-center hover:text-[#006b3f] transition-colors">Academics</Link>
                        </nav>
                    )}

                    {/* Search Input */}
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder={isTeacherRoute ? "Search (students, classes, assignments...)" : "Search ..."} 
                            className="bg-gray-100 border border-gray-200 text-xs rounded-xl pl-9 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-64 md:w-80 text-gray-700 placeholder-gray-400"
                        />
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    </div>

                    {/* Notification & Message Badges for Teacher Header */}
                    {isTeacherRoute && (
                        <div className="flex items-center space-x-3">
                            <button className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors" title="Notifications">
                                <Bell className="w-5 h-5 text-gray-600" />
                                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">12</span>
                            </button>

                            <button className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors" title="Messages">
                                <MessageSquare className="w-5 h-5 text-gray-600" />
                                <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">27</span>
                            </button>
                        </div>
                    )}

                    {/* User Profile Info */}
                    <div className="flex items-center space-x-3 border-l pl-4 border-gray-200">
                        <div className="w-8 h-8 rounded-full bg-blue-600 border border-white flex items-center justify-center text-white font-bold text-xs shadow-sm">
                            {authData?.user?.name ? authData.user.name.split(' ').map((n: string) => n[0]).join('') : "Y"}
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-xs font-bold text-gray-800 leading-tight">{authData?.user?.name || "Mr. Yohannes"}</p>
                            <p className="text-[10px] text-gray-500 font-medium leading-tight">{isTeacherRoute ? "Teacher" : roleName}</p>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />

                        <button onClick={handleLogout} className="text-gray-400 hover:text-red-600 transition-colors ml-2" title="Logout">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                {isTeacherRoute ? (
                    <aside className="w-64 bg-[#0a203d] border-r border-[#153258] flex flex-col hidden md:flex overflow-y-auto text-white">
                        <div className="p-4 flex-1">
                            {/* Teacher Profile Card */}
                            <div className="mb-5 p-3.5 bg-[#122e54] rounded-2xl border border-blue-400/10 flex items-center space-x-3 shadow-inner">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white/20 flex items-center justify-center font-bold text-xs text-white overflow-hidden shadow-sm">
                                        {authData?.user?.name ? authData.user.name.split(' ').map((n: string) => n[0]).join('') : "Y"}
                                    </div>
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#122e54] rounded-full"></span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-white truncate">{authData?.user?.name || "Mr. Yohannes"}</p>
                                    <p className="text-[10px] text-blue-200/80 truncate">Mathematics Teacher</p>
                                    <span className="text-[9px] text-emerald-400 font-semibold flex items-center mt-0.5">
                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1 animate-pulse"></span> Online
                                    </span>
                                </div>
                            </div>

                            <nav className="space-y-1">
                                {/* Active Dashboard Button */}
                                <Link 
                                    href="/dashboard/teacher" 
                                    className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                        pathname === "/dashboard/teacher" 
                                            ? "bg-[#1d70f5] text-white shadow-md shadow-blue-600/30" 
                                            : "text-blue-100/70 hover:bg-white/5 hover:text-white"
                                    }`}
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    <span>Dashboard</span>
                                </Link>

                                {/* Section 1: TEACHING */}
                                <div className="pt-4">
                                    <p className="text-[10px] text-blue-300/50 font-bold uppercase tracking-wider px-3 mb-2">TEACHING</p>
                                    <div className="space-y-1">
                                        <Link href="/dashboard/teacher/my-classes" className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${pathname === "/dashboard/teacher/my-classes" ? "bg-white/10 text-white font-bold" : "text-blue-100/70 hover:bg-white/5 hover:text-white"}`}>
                                            <div className="flex items-center space-x-2.5">
                                                <BookOpen className="w-3.5 h-3.5 text-blue-300/70" />
                                                <span>My Classes</span>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-blue-300/40" />
                                        </Link>
                                        <Link href="/dashboard/teacher/students" className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${pathname === "/dashboard/teacher/students" ? "bg-white/10 text-white font-bold" : "text-blue-100/70 hover:bg-white/5 hover:text-white"}`}>
                                            <div className="flex items-center space-x-2.5">
                                                <Users className="w-3.5 h-3.5 text-blue-300/70" />
                                                <span>Students</span>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-blue-300/40" />
                                        </Link>
                                        <Link href="/dashboard/attendance/teacher" className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${pathname.startsWith("/dashboard/attendance") ? "bg-white/10 text-white font-bold" : "text-blue-100/70 hover:bg-white/5 hover:text-white"}`}>
                                            <div className="flex items-center space-x-2.5">
                                                <ClipboardCheck className="w-3.5 h-3.5 text-blue-300/70" />
                                                <span>Attendance</span>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-blue-300/40" />
                                        </Link>
                                        <Link href="/dashboard/teacher/curriculum" className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${pathname === "/dashboard/teacher/curriculum" ? "bg-white/10 text-white font-bold" : "text-blue-100/70 hover:bg-white/5 hover:text-white"}`}>
                                            <div className="flex items-center space-x-2.5">
                                                <FileText className="w-3.5 h-3.5 text-blue-300/70" />
                                                <span>Lesson & Curriculum</span>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-blue-300/40" />
                                        </Link>
                                        <Link href="/dashboard/teacher/assessment" className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${pathname.startsWith("/dashboard/teacher/assessment") ? "bg-white/10 text-white font-bold" : "text-blue-100/70 hover:bg-white/5 hover:text-white"}`}>
                                            <div className="flex items-center space-x-2.5">
                                                <GraduationCap className="w-3.5 h-3.5 text-blue-300/70" />
                                                <span>Assessments</span>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-blue-300/40" />
                                        </Link>
                                        <Link href="/dashboard/teacher/activities" className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${pathname === "/dashboard/teacher/activities" ? "bg-white/10 text-white font-bold" : "text-blue-100/70 hover:bg-white/5 hover:text-white"}`}>
                                            <div className="flex items-center space-x-2.5">
                                                <ClipboardCheck className="w-3.5 h-3.5 text-blue-300/70" />
                                                <span>Learning Activities</span>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-blue-300/40" />
                                        </Link>
                                        <Link href="/dashboard/teacher/support" className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${pathname === "/dashboard/teacher/support" ? "bg-white/10 text-white font-bold" : "text-blue-100/70 hover:bg-white/5 hover:text-white"}`}>
                                            <div className="flex items-center space-x-2.5">
                                                <HeartHandshake className="w-3.5 h-3.5 text-blue-300/70" />
                                                <span>Student Support</span>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-blue-300/40" />
                                        </Link>
                                    </div>
                                </div>

                                {/* Section 2: COMMUNICATION */}
                                <div className="pt-4">
                                    <p className="text-[10px] text-blue-300/50 font-bold uppercase tracking-wider px-3 mb-2">COMMUNICATION</p>
                                    <div className="space-y-1">
                                        <Link href="/dashboard/teacher/communication/parent" className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${pathname.includes("parent") ? "bg-white/10 text-white font-bold" : "text-blue-100/70 hover:bg-white/5 hover:text-white"}`}>
                                            <div className="flex items-center space-x-2.5">
                                                <Users className="w-3.5 h-3.5 text-blue-300/70" />
                                                <span>Parent Communication</span>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-blue-300/40" />
                                        </Link>
                                        <Link href="/dashboard/teacher/communication/staff" className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${pathname.includes("staff") ? "bg-white/10 text-white font-bold" : "text-blue-100/70 hover:bg-white/5 hover:text-white"}`}>
                                            <div className="flex items-center space-x-2.5">
                                                <MessageSquare className="w-3.5 h-3.5 text-blue-300/70" />
                                                <span>Teacher Communication</span>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-blue-300/40" />
                                        </Link>
                                    </div>
                                </div>

                {/* Section 3: PROFESSIONAL */}
                                <div className="pt-4">
                                    <p className="text-[10px] text-blue-300/50 font-bold uppercase tracking-wider px-3 mb-2">PROFESSIONAL</p>
                                    <div className="space-y-1">
                                        <Link href="/dashboard/teacher/pd" className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${pathname === "/dashboard/teacher/pd" ? "bg-white/10 text-white font-bold" : "text-blue-100/70 hover:bg-white/5 hover:text-white"}`}>
                                            <div className="flex items-center space-x-2.5">
                                                <GraduationCap className="w-3.5 h-3.5 text-blue-300/70" />
                                                <span>Professional Development</span>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-blue-300/40" />
                                        </Link>
                                        <Link href="/dashboard/teacher/reports" className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${pathname === "/dashboard/teacher/reports" ? "bg-white/10 text-white font-bold" : "text-blue-100/70 hover:bg-white/5 hover:text-white"}`}>
                                            <div className="flex items-center space-x-2.5">
                                                <BarChart2 className="w-3.5 h-3.5 text-blue-300/70" />
                                                <span>Reports</span>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-blue-300/40" />
                                        </Link>
                                    </div>
                                </div>

                                {/* Section 4: AI ASSISTANT */}
                                <div className="pt-4">
                                    <p className="text-[10px] text-blue-300/50 font-bold uppercase tracking-wider px-3 mb-2">AI ASSISTANT</p>
                                    <div className="space-y-1">
                                        <Link href="/dashboard/teacher/ai-assistant" className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${pathname === "/dashboard/teacher/ai-assistant" ? "bg-purple-600/30 text-purple-200 font-bold border border-purple-400/20" : "text-purple-300/80 hover:bg-purple-600/20 hover:text-white"}`}>
                                            <div className="flex items-center space-x-2.5">
                                                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                                <span>AI Teacher Assistant</span>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-purple-300/40" />
                                        </Link>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-[#153258] mt-6 mb-4">
                                    <Link href="/dashboard/teacher/settings" className="flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-blue-100/70 hover:bg-white/5 hover:text-white rounded-lg transition-all">
                                        <Settings className="w-3.5 h-3.5 text-blue-300/70" />
                                        <span>Settings</span>
                                    </Link>
                                </div>
                            </nav>
                        </div>
                    </aside>
                ) : (
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
                                                    <Link href="/dashboard/academics/subjects" className={`block py-1.5 text-sm ${pathname.startsWith("/dashboard/academics/subjects") ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Subjects</Link>
                                                    <Link href="/dashboard/academics/timetable" className={`block py-1.5 text-sm ${pathname.startsWith("/dashboard/academics/timetable") ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Timetable</Link>
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
                                                    <Link href="/dashboard/teachers" className={`block py-1.5 text-sm ${pathname === "/dashboard/teachers" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Teachers</Link>
                                                    <Link href="/dashboard/teachers/assignments" className={`block py-1.5 text-sm ${pathname.startsWith("/dashboard/teachers/assignments") ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Assignments</Link>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Attendance Group */}
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
                                                    <Link href="/dashboard/attendance/student" className={`block py-1.5 text-sm ${pathname === "/dashboard/attendance/student" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Student Attendance</Link>
                                                    <Link href="/dashboard/attendance/teacher" className={`block py-1.5 text-sm ${pathname === "/dashboard/attendance/teacher" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Teacher Attendance</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Assessment Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => toggleMenu("assessment")}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <FileText className="w-4 h-4 text-gray-500" />
                                                    <span>Assessment</span>
                                                </div>
                                                {openMenus.assessment ? 
                                                    <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                }
                                            </button>
                                            {openMenus.assessment && (
                                                <div className="pl-10 pr-3 py-1 space-y-1">
                                                    <Link href="/dashboard/assessment" className={`block py-1.5 text-sm ${pathname === "/dashboard/assessment" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Assessments</Link>
                                                    <Link href="/dashboard/assessment/results" className={`block py-1.5 text-sm ${pathname.startsWith("/dashboard/assessment/results") ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Student Results</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Learning Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => toggleMenu("learning")}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <BookOpen className="w-4 h-4 text-gray-500" />
                                                    <span>Learning & Support</span>
                                                </div>
                                                {openMenus.learning ? 
                                                    <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                }
                                            </button>
                                            {openMenus.learning && (
                                                <div className="pl-10 pr-3 py-1 space-y-1">
                                                    <Link href="/dashboard/learning/activities" className={`block py-1.5 text-sm ${pathname === "/dashboard/learning/activities" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Activities</Link>
                                                    <Link href="/dashboard/learning/submissions" className={`block py-1.5 text-sm ${pathname === "/dashboard/learning/submissions" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Submissions</Link>
                                                    <Link href="/dashboard/learning/support" className={`block py-1.5 text-sm ${pathname === "/dashboard/learning/support" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Support Flags</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Parents Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => toggleMenu("parents")}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Users className="w-4 h-4 text-gray-500" />
                                                    <span>Parents</span>
                                                </div>
                                                {openMenus.parents ? 
                                                    <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                }
                                            </button>
                                            {openMenus.parents && (
                                                <div className="pl-10 pr-3 py-1 space-y-1">
                                                    <Link href="/dashboard/parents" className={`block py-1.5 text-sm ${pathname === "/dashboard/parents" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Parents</Link>
                                                    <Link href="/dashboard/parents/relationships" className={`block py-1.5 text-sm ${pathname === "/dashboard/parents/relationships" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Relationships</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Communication Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => toggleMenu("communication")}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Megaphone className="w-4 h-4 text-gray-500" />
                                                    <span>Communication</span>
                                                </div>
                                                {openMenus.communication ? 
                                                    <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                }
                                            </button>
                                            {openMenus.communication && (
                                                <div className="pl-10 pr-3 py-1 space-y-1">
                                                    <Link href="/dashboard/communication/announcements" className={`block py-1.5 text-sm ${pathname === "/dashboard/communication/announcements" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Announcements</Link>
                                                    <Link href="/dashboard/communication/notifications" className={`block py-1.5 text-sm ${pathname === "/dashboard/communication/notifications" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Notifications</Link>
                                                    <Link href="/dashboard/communication/messages" className={`block py-1.5 text-sm ${pathname === "/dashboard/communication/messages" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Messages</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Operations Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => toggleMenu("operations")}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Settings className="w-4 h-4 text-gray-500" />
                                                    <span>Operations</span>
                                                </div>
                                                {openMenus.operations ? 
                                                    <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                }
                                            </button>
                                            {openMenus.operations && (
                                                <div className="pl-10 pr-3 py-1 space-y-1">
                                                    <Link href="/dashboard/operations/resources" className={`block py-1.5 text-sm ${pathname === "/dashboard/operations/resources" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Resources</Link>
                                                    <Link href="/dashboard/operations/issues" className={`block py-1.5 text-sm ${pathname === "/dashboard/operations/issues" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Issues</Link>
                                                    <Link href="/dashboard/operations/improvements" className={`block py-1.5 text-sm ${pathname === "/dashboard/operations/improvements" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Improvements</Link>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {roleName === "VICE_PRINCIPAL" && (
                                    <>
                                        <Link 
                                            href="/dashboard/vice-principal" 
                                            className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${pathname === "/dashboard/vice-principal" ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <LayoutDashboard className="w-4 h-4 text-gray-500" />
                                                <span>Dashboard</span>
                                            </div>
                                        </Link>

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
                                                    <Link href="/dashboard/vice-principal/organization" className={`block py-1.5 text-sm ${pathname === "/dashboard/vice-principal/organization" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Organization</Link>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-1">
                                            <button 
                                                onClick={() => toggleMenu("teachers")}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Users className="w-4 h-4 text-gray-500" />
                                                    <span>Teachers</span>
                                                </div>
                                                {openMenus.teachers ? 
                                                    <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                }
                                            </button>
                                            {openMenus.teachers && (
                                                <div className="pl-10 pr-3 py-1 space-y-1">
                                                    <Link href="/dashboard/vice-principal/teachers" className={`block py-1.5 text-sm ${pathname === "/dashboard/vice-principal/teachers" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Teaching Monitoring</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Attendance Group */}
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
                                                    <Link href="/dashboard/vice-principal/attendance" className={`block py-1.5 text-sm ${pathname === "/dashboard/vice-principal/attendance" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Student Attendance</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Assessment Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => toggleMenu("assessment")}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <FileText className="w-4 h-4 text-gray-500" />
                                                    <span>Assessment</span>
                                                </div>
                                                {openMenus.assessment ? 
                                                    <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                }
                                            </button>
                                            {openMenus.assessment && (
                                                <div className="pl-10 pr-3 py-1 space-y-1">
                                                    <Link href="/dashboard/vice-principal/assessments" className={`block py-1.5 text-sm ${pathname === "/dashboard/vice-principal/assessments" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Assessments Overview</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Support Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => toggleMenu("support")}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <HeartHandshake className="w-4 h-4 text-gray-500" />
                                                    <span>Support Systems</span>
                                                </div>
                                                {openMenus.support ? 
                                                    <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                }
                                            </button>
                                            {openMenus.support && (
                                                <div className="pl-10 pr-3 py-1 space-y-1">
                                                    <Link href="/dashboard/vice-principal/support/students" className={`block py-1.5 text-sm ${pathname === "/dashboard/vice-principal/support/students" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Student Support</Link>
                                                    <Link href="/dashboard/vice-principal/support/teachers" className={`block py-1.5 text-sm ${pathname === "/dashboard/vice-principal/support/teachers" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Teacher Support</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Reports Link */}
                                        <div className="pt-1">
                                            <Link 
                                                href="/dashboard/vice-principal/reports" 
                                                className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${pathname === "/dashboard/vice-principal/reports" ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <BarChart2 className="w-4 h-4 text-gray-500" />
                                                    <span>Academic Reports</span>
                                                </div>
                                            </Link>
                                        </div>

                                        {/* Communication Link */}
                                        <div className="pt-1">
                                            <Link 
                                                href="/dashboard/vice-principal/communication" 
                                                className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${pathname === "/dashboard/vice-principal/communication" ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <MessageSquare className="w-4 h-4 text-gray-500" />
                                                    <span>Communication</span>
                                                </div>
                                            </Link>
                                        </div>

                                        {/* AI Insights Link */}
                                        <div className="pt-1">
                                            <Link 
                                                href="/dashboard/vice-principal/ai-insights" 
                                                className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${pathname === "/dashboard/vice-principal/ai-insights" ? "bg-purple-50 text-purple-900 font-medium border border-purple-100" : "text-purple-700 hover:bg-purple-50"}`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Sparkles className="w-4 h-4 text-purple-500" />
                                                    <span>AI Assistant</span>
                                                </div>
                                            </Link>
                                        </div>
                                    </>
                                )}
                            </nav>
                        </div>
                    </aside>
                )}

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col overflow-y-auto">
                    {/* Blue Banner for non-teacher dashboards */}
                    {!isTeacherRoute && (
                        <div className="bg-blue-500 text-white px-8 py-5">
                            <h1 className="text-2xl font-bold tracking-wide">The hub for quality education in Ethiopia</h1>
                        </div>
                    )}
                    
                    {/* Page Content Padding */}
                    <div className={isTeacherRoute ? "p-4 md:p-6" : "p-6 md:p-8"}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

