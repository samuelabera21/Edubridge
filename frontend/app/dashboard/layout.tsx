"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Loader2, BookOpen, LogOut, LayoutDashboard, Building, Search, Lock, ChevronDown, ChevronRight, Calendar, Users, GraduationCap, ClipboardCheck, FileText, Settings, User, Megaphone, Bell, MessageSquare, Package, AlertOctagon, TrendingUp, HeartHandshake, BarChart2, Sparkles, Menu, Brain } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "../../lib/api";
import StudentNavigation from "./student/StudentNavigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { authData, loading, error } = useAuth(true);
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTab = searchParams?.get("tab") || "take";

    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        dashboard: pathname === "/dashboard",
        academics: pathname.startsWith("/dashboard/academics"),
        students: pathname.startsWith("/dashboard/students"),
        teachers: pathname.startsWith("/dashboard/teachers"),
        attendance: pathname.startsWith("/dashboard/attendance"),
        teacherAttendance: pathname.startsWith("/dashboard/teacher/attendance"),
        teacherCurriculum: pathname.startsWith("/dashboard/teacher/curriculum"),
        assessment: pathname.startsWith("/dashboard/assessment"),
        learning: pathname.startsWith("/dashboard/learning"),
        parents: pathname.startsWith("/dashboard/parents"),
        communication: pathname.startsWith("/dashboard/communication"),
        operations: pathname.startsWith("/dashboard/operations"),
    });

    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [headerCounts, setHeaderCounts] = useState<{ notifications: number; messages: number }>({
        notifications: 0,
        messages: 0,
    });

    const primaryAccess = authData?.access?.[0];
    const roleName = primaryAccess?.role?.name || "Unassigned";
    const isTeacherRoute = (pathname === "/dashboard/teacher" || pathname.startsWith("/dashboard/teacher/")) && roleName === "TEACHER";
    const isStudentRoute = (pathname === "/dashboard/student" || pathname.startsWith("/dashboard/student/")) || roleName === "STUDENT";

    useEffect(() => {
        if (isTeacherRoute && authData) {
            async function loadHeaderCounts() {
                try {
                    const res = await fetchApi("/teacher/dashboard-summary");
                    if (res.ok) {
                        const data = await res.json();
                        const notifs = (data.attendancePendingCount || 0) + (data.studentsNeedAttentionCount || 0);
                        const msgs = (data.pendingSubmissionsCount || 0) + (data.pendingAssessmentsCount || 0);
                        setHeaderCounts({ notifications: notifs, messages: msgs });
                    }
                } catch (err) {
                    console.error("Failed to load header counts:", err);
                }
            }
            loadHeaderCounts();
        }
    }, [isTeacherRoute, pathname, authData]);

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

    // The /dashboard route is intentionally not a valid destination.
    // Render the 404 page directly, bypassing the auth layout shell.
    if (pathname === "/dashboard") {
        return <>{children}</>;
    }

    if (error || !authData) {
        return null;
    }

    // First-login password change enforcement
    if (authData.requiresPasswordChange || authData.user?.requiresPasswordChange) {
        router.push("/change-password");
        return null;
    }

    // Inactive account check
    if (authData.isActive === false || authData.user?.isActive === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] text-gray-700 p-6">
                <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md text-center space-y-4">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                        <Lock className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Account Deactivated</h2>
                    <p className="text-sm text-gray-600">
                        Your account is currently inactive. Please contact your system administrator.
                    </p>
                    <button
                        onClick={async () => {
                            await fetchApi("/auth/sign-out", { method: "POST" });
                            router.push("/login");
                        }}
                        className="px-5 py-2.5 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-colors"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    // Server-side validated role authorization check
    const isRouteAuthorized = (() => {
        const isAdmin = ["ADMIN", "SCHOOL_ADMIN", "ADMINISTRATOR"].includes(roleName);

        // 1. /dashboard/teachers (plural) is the Admin Teacher Management route
        if (pathname.startsWith("/dashboard/teachers")) {
            return isAdmin;
        }

        // 2. /dashboard/teacher (singular) is strictly reserved for the TEACHER actor workspace
        if (pathname === "/dashboard/teacher" || pathname.startsWith("/dashboard/teacher/")) {
            return roleName === "TEACHER";
        }

        // 3. Admin routes (/dashboard/admin, /dashboard/academics, /dashboard/school) are strictly for ADMIN roles
        if (
            pathname.startsWith("/dashboard/admin") ||
            pathname.startsWith("/dashboard/academics") ||
            pathname.startsWith("/dashboard/school")
        ) {
            return isAdmin;
        }

        // 4. Student routes
        if (pathname.startsWith("/dashboard/student")) {
            return roleName === "STUDENT" || isAdmin;
        }

        // 5. Parent routes
        if (pathname.startsWith("/dashboard/parent")) {
            return roleName === "PARENT" || isAdmin;
        }

        // 6. Vice Principal routes
        if (pathname.startsWith("/dashboard/vice-principal")) {
            return roleName === "VICE_PRINCIPAL" || isAdmin;
        }

        return true;
    })();

    if (!isRouteAuthorized) {
        const getAuthorizedRolePath = (role: string) => {
            switch (role) {
                case "ADMIN":
                case "SCHOOL_ADMIN":
                case "ADMINISTRATOR": return "/dashboard/admin";
                case "TEACHER": return "/dashboard/teacher";
                case "STUDENT": return "/dashboard/student";
                case "PARENT": return "/dashboard/parent";
                case "VICE_PRINCIPAL": return "/dashboard/vice-principal";
                default: return "/dashboard";
            }
        };

        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] text-gray-700 p-6">
                <div className="bg-white rounded-2xl shadow-lg border border-amber-200 p-8 max-w-md text-center space-y-4">
                    <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                        <Lock className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">403 - Forbidden Access</h2>
                    <p className="text-sm text-gray-600">
                        You do not have authorization to access this page ({pathname}). You are logged in as <span className="font-bold text-gray-800">{roleName}</span>.
                    </p>
                    <button
                        onClick={() => router.push(getAuthorizedRolePath(roleName))}
                        className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Go to My Authorized Dashboard
                    </button>
                </div>
            </div>
        );
    }

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
                    <div className="flex items-center space-x-2">
                        <div className="text-[#006b3f]">
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L2 7l10 5 10-5-10-5zm0 7.5L4.5 7 12 4.25 19.5 7 12 9.5zM2 12l10 5 10-5v5l-10 5-10-5v-5z"/>
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-orange-500 tracking-tight">Edu<span className="text-[#006b3f]">Bridge</span></span>
                    </div>
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
                            <button 
                                onClick={() => router.push("/dashboard/teacher/support")}
                                className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer" 
                                title="Notifications (Pending Tasks & Alerts)"
                            >
                                <Bell className="w-5 h-5 text-gray-600" />
                                {headerCounts.notifications > 0 && (
                                    <span className="absolute top-1 right-1 px-1 min-w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                        {headerCounts.notifications}
                                    </span>
                                )}
                            </button>

                            <button 
                                onClick={() => router.push("/dashboard/teacher/communication/parent")}
                                className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer" 
                                title="Messages (Activity Submissions & Parent Requests)"
                            >
                                <MessageSquare className="w-5 h-5 text-gray-600" />
                                {headerCounts.messages > 0 && (
                                    <span className="absolute top-1 right-1 px-1 min-w-4 h-4 bg-[#4085b3] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                        {headerCounts.messages}
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    {/* User Profile Info & Interactive Dropdown Menu */}
                    <div className="relative border-l pl-4 border-gray-200">
                        <button 
                            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                            className="flex items-center space-x-2.5 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-full bg-[#4085b3] border border-white flex items-center justify-center text-white font-bold text-xs shadow-2xs">
                                {authData?.user?.name ? authData.user.name.split(' ').map((n: string) => n[0]).join('') : "Y"}
                            </div>
                            <div className="hidden sm:block text-left">
                                <p className="text-xs font-bold text-gray-800 leading-tight">{authData?.user?.name || "Mr. Yohannes"}</p>
                                <p className="text-[10px] text-gray-500 font-medium leading-tight">{isTeacherRoute ? "Teacher" : roleName}</p>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showProfileDropdown ? "rotate-180" : ""}`} />
                        </button>

                        {/* Dropdown Menu Popup */}
                        {showProfileDropdown && (
                            <div 
                                className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 text-xs font-medium text-gray-700 animate-in fade-in slide-in-from-top-2 duration-150"
                                onMouseLeave={() => setShowProfileDropdown(false)}
                            >
                                {/* Header info */}
                                <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                                    <p className="font-bold text-gray-900 text-xs">{authData?.user?.name || "Mr. Yohannes"}</p>
                                    <p className="text-[10px] text-gray-500 truncate">{authData?.user?.email || "teacher@edubridge.local"}</p>
                                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-[#4085b3] rounded font-bold text-[9px]">
                                        {isTeacherRoute ? "TEACHER ROLE" : roleName}
                                    </span>
                                </div>

                                {/* Links */}
                                <div className="py-1">
                                    <Link 
                                        href="/dashboard/teacher/settings" 
                                        onClick={() => setShowProfileDropdown(false)}
                                        className="flex items-center px-4 py-2 hover:bg-gray-50 text-gray-700 space-x-2 transition-colors"
                                    >
                                        <User className="w-4 h-4 text-gray-500" />
                                        <span>My Profile</span>
                                    </Link>

                                    <Link 
                                        href="/dashboard/teacher/settings" 
                                        onClick={() => setShowProfileDropdown(false)}
                                        className="flex items-center px-4 py-2 hover:bg-gray-50 text-gray-700 space-x-2 transition-colors"
                                    >
                                        <Settings className="w-4 h-4 text-gray-500" />
                                        <span>Account Settings</span>
                                    </Link>
                                </div>

                                {/* Logout button */}
                                <div className="border-t border-gray-100 pt-1 mt-1">
                                    <button 
                                        onClick={() => {
                                            setShowProfileDropdown(false);
                                            handleLogout();
                                        }}
                                        className="w-full flex items-center px-4 py-2 text-rose-600 hover:bg-rose-50 space-x-2 transition-colors text-left font-semibold cursor-pointer"
                                    >
                                        <LogOut className="w-4 h-4 text-rose-600" />
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                {isTeacherRoute ? (
                    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex overflow-y-auto text-gray-800">
                        <div className="p-4 flex-1">
                            <nav className="space-y-1 text-gray-700">
                                {/* Active Dashboard Button */}
                                <Link 
                                    href="/dashboard/teacher" 
                                    className={`flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs font-normal transition-colors ${
                                        pathname === "/dashboard/teacher" 
                                            ? "bg-[#4085b3] text-white shadow-2xs" 
                                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                    }`}
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    <span>Dashboard</span>
                                </Link>

                                {/* Section 1: TEACHING ASSIGNMENTS */}
                                <div className="pt-2">
                                    <button 
                                        onClick={() => toggleMenu("teacherAssignments")}
                                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-normal text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center space-x-2.5">
                                            <BookOpen className="w-4 h-4 text-[#4085b3]" />
                                            <span>My Teaching Assignments</span>
                                        </div>
                                        {openMenus.teacherAssignments ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                    </button>
                                     {openMenus.teacherAssignments && (
                                        <div className="pl-6 pt-1 space-y-1">
                                            <Link href="/dashboard/teacher/my-classes?tab=subjects" className="block px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
                                                Subjects
                                            </Link>
                                            <Link href="/dashboard/teacher/my-classes?tab=grades" className="block px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
                                                Grades
                                            </Link>
                                            <Link href="/dashboard/teacher/my-classes?tab=sections" className="block px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
                                                Sections
                                            </Link>
                                            <Link href="/dashboard/teacher/my-classes?tab=classes" className="block px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
                                                Classes
                                            </Link>
                                            <Link href="/dashboard/teacher/my-classes?tab=schedule" className="block px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
                                                Teaching Schedule
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 2: STUDENT MANAGEMENT */}
                                <div className="pt-2">
                                    <Link 
                                        href="/dashboard/teacher/students"
                                        className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-normal rounded-lg transition-colors ${
                                            pathname === "/dashboard/teacher/students" 
                                                ? "bg-blue-50 text-[#4085b3] font-medium" 
                                                : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                    >
                                        <Users className="w-4 h-4 text-[#4085b3]" />
                                        <span>Student Management</span>
                                    </Link>
                                </div>

                                {/* Section 3: ATTENDANCE */}
                                <div className="pt-2">
                                    <button 
                                        onClick={() => toggleMenu("teacherAttendance")}
                                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-normal text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center space-x-2.5">
                                            <ClipboardCheck className="w-4 h-4 text-[#247297]" />
                                            <span className="font-semibold text-gray-900">Attendance</span>
                                        </div>
                                        {openMenus.teacherAttendance ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                    </button>
                                    {openMenus.teacherAttendance && (
                                        <div className="pl-6 pt-1 space-y-1">
                                            <Link 
                                                href="/dashboard/teacher/attendance?tab=take" 
                                                className={`block px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                                    pathname === "/dashboard/teacher/attendance" && (currentTab === "take" || !searchParams?.get("tab"))
                                                        ? "bg-blue-50 text-[#247297] font-extrabold" 
                                                        : "text-gray-600 hover:bg-gray-50 font-normal"
                                                }`}
                                            >
                                                Take Student Attendance
                                            </Link>
                                            <Link 
                                                href="/dashboard/teacher/attendance?tab=history" 
                                                className={`block px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                                    pathname === "/dashboard/teacher/attendance" && currentTab === "history"
                                                        ? "bg-blue-50 text-[#247297] font-extrabold" 
                                                        : "text-gray-600 hover:bg-gray-50 font-normal"
                                                }`}
                                            >
                                                View Attendance History
                                            </Link>
                                            <Link 
                                                href="/dashboard/teacher/attendance?tab=reasons" 
                                                className={`block px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                                    pathname === "/dashboard/teacher/attendance" && currentTab === "reasons"
                                                        ? "bg-blue-50 text-[#247297] font-extrabold" 
                                                        : "text-gray-600 hover:bg-gray-50 font-normal"
                                                }`}
                                            >
                                                Record Absence Reason
                                            </Link>
                                            <Link 
                                                href="/dashboard/teacher/attendance?tab=repeated" 
                                                className={`block px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                                    pathname === "/dashboard/teacher/attendance" && currentTab === "repeated"
                                                        ? "bg-blue-50 text-[#247297] font-extrabold" 
                                                        : "text-gray-600 hover:bg-gray-50 font-normal"
                                                }`}
                                            >
                                                Identify Repeated Absences
                                            </Link>
                                            <Link 
                                                href="/dashboard/teacher/attendance?tab=report" 
                                                className={`block px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                                    pathname === "/dashboard/teacher/attendance" && currentTab === "report"
                                                        ? "bg-blue-50 text-[#247297] font-extrabold" 
                                                        : "text-gray-600 hover:bg-gray-50 font-normal"
                                                }`}
                                            >
                                                Report Attendance Problems
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 4: LESSON / CURRICULUM */}
                                <div className="pt-2">
                                    <button 
                                        onClick={() => toggleMenu("teacherCurriculum")}
                                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-normal text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center space-x-2.5">
                                            <FileText className="w-4 h-4 text-[#4085b3]" />
                                            <span>Lesson / Curriculum</span>
                                        </div>
                                        {openMenus.teacherCurriculum ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                    </button>
                                    {openMenus.teacherCurriculum && (
                                        <div className="pl-6 pt-1 space-y-1">
                                            <Link href="/dashboard/teacher/curriculum?tab=view" className={`block px-3 py-1.5 rounded-lg text-xs font-normal ${pathname === "/dashboard/teacher/curriculum" ? "bg-blue-50 text-[#4085b3]" : "text-gray-600 hover:bg-gray-50"}`}>
                                                View Curriculum
                                            </Link>
                                            <Link href="/dashboard/teacher/curriculum?tab=log" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Record Lesson Progress
                                            </Link>
                                            <Link href="/dashboard/teacher/curriculum?tab=log" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Record Topics Covered
                                            </Link>
                                            <Link href="/dashboard/teacher/curriculum?tab=progress" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Track Curriculum Progress
                                            </Link>
                                            <Link href="/dashboard/teacher/curriculum?tab=difficulties" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Record Learning Difficulties
                                            </Link>
                                            <Link href="/dashboard/teacher/curriculum?tab=notes" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Record Teaching Notes
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 5: ASSESSMENT */}
                                <div className="pt-2">
                                    <button 
                                        onClick={() => toggleMenu("teacherAssessment")}
                                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-normal text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center space-x-2.5">
                                            <GraduationCap className="w-4 h-4 text-[#4085b3]" />
                                            <span>Assessment & Grades</span>
                                        </div>
                                        {openMenus.teacherAssessment ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                    </button>
                                    {openMenus.teacherAssessment && (
                                        <div className="pl-6 pt-1 space-y-1">
                                            <Link href="/dashboard/teacher/assessment?type=ALL" className={`block px-3 py-1.5 rounded-lg text-xs font-normal ${pathname === "/dashboard/teacher/assessment" ? "bg-blue-50 text-[#4085b3]" : "text-gray-600 hover:bg-gray-50"}`}>
                                                Create Assessment
                                            </Link>
                                            <Link href="/dashboard/teacher/assessment?type=QUIZ" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Create Quiz
                                            </Link>
                                            <Link href="/dashboard/teacher/assessment?type=TEST" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Create Test
                                            </Link>
                                            <Link href="/dashboard/teacher/assessment?type=ASSIGNMENT" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Create Assignment
                                            </Link>
                                            <Link href="/dashboard/teacher/assessment?type=PROJECT" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Create Project
                                            </Link>
                                            <Link href="/dashboard/teacher/assessment?tab=conduct" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Conduct Assessment
                                            </Link>
                                            <Link href="/dashboard/teacher/assessment?tab=grade" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Record Results & Grade
                                            </Link>
                                            <Link href="/dashboard/teacher/assessment?tab=feedback" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Provide Feedback
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 6: LEARNING ACTIVITIES */}
                                <div className="pt-2">
                                    <button 
                                        onClick={() => toggleMenu("teacherActivities")}
                                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-normal text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center space-x-2.5">
                                            <ClipboardCheck className="w-4 h-4 text-[#4085b3]" />
                                            <span>Learning Activities</span>
                                        </div>
                                        {openMenus.teacherActivities ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                    </button>
                                    {openMenus.teacherActivities && (
                                        <div className="pl-6 pt-1 space-y-1">
                                            <Link href="/dashboard/teacher/learning?type=HOMEWORK" className={`block px-3 py-1.5 rounded-lg text-xs font-normal ${pathname === "/dashboard/teacher/learning" ? "bg-blue-50 text-[#4085b3]" : "text-gray-600 hover:bg-gray-50"}`}>
                                                Create Assignment
                                            </Link>
                                            <Link href="/dashboard/teacher/learning?type=QUIZ" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Create Quiz
                                            </Link>
                                            <Link href="/dashboard/teacher/learning?type=CLASS_WORK" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Create Class Activity
                                            </Link>
                                            <Link href="/dashboard/teacher/learning?tab=create" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Set Deadline
                                            </Link>
                                            <Link href="/dashboard/teacher/learning?tab=submissions" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Review Submissions
                                            </Link>
                                            <Link href="/dashboard/teacher/learning?tab=submissions" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Mark Completion
                                            </Link>
                                            <Link href="/dashboard/teacher/learning?tab=submissions" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Give Feedback
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 7: STUDENT SUPPORT */}
                                <div className="pt-2">
                                    <button 
                                        onClick={() => toggleMenu("teacherSupport")}
                                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-normal text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center space-x-2.5">
                                            <HeartHandshake className="w-4 h-4 text-[#4085b3]" />
                                            <span>Student Support</span>
                                        </div>
                                        {openMenus.teacherSupport ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                    </button>
                                    {openMenus.teacherSupport && (
                                        <div className="pl-6 pt-1 space-y-1">
                                            <Link href="/dashboard/teacher/support" className={`block px-3 py-1.5 rounded-lg text-xs font-normal ${pathname === "/dashboard/teacher/support" ? "bg-blue-50 text-[#4085b3]" : "text-gray-600 hover:bg-gray-50"}`}>
                                                Flag At-Risk Student
                                            </Link>
                                            <Link href="/dashboard/teacher/support" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Monitor Interventions
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 8: PARENT COMMUNICATION */}
                                <div className="pt-2">
                                    <button 
                                        onClick={() => toggleMenu("teacherParentComm")}
                                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-normal text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center space-x-2.5">
                                            <Users className="w-4 h-4 text-[#4085b3]" />
                                            <span>Parent Communication</span>
                                        </div>
                                        {openMenus.teacherParentComm ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                    </button>
                                    {openMenus.teacherParentComm && (
                                        <div className="pl-6 pt-1 space-y-1">
                                            <Link href="/dashboard/teacher/communication/parent" className={`block px-3 py-1.5 rounded-lg text-xs font-normal ${pathname.includes("parent") ? "bg-blue-50 text-[#4085b3]" : "text-gray-600 hover:bg-gray-50"}`}>
                                                Send Parent Message
                                            </Link>
                                            <Link href="/dashboard/teacher/communication/parent" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Attendance Notifications
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 9: STAFF COMMUNICATION */}
                                <div className="pt-2">
                                    <button 
                                        onClick={() => toggleMenu("teacherStaffComm")}
                                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-normal text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center space-x-2.5">
                                            <MessageSquare className="w-4 h-4 text-[#4085b3]" />
                                            <span>Teacher Communication</span>
                                        </div>
                                        {openMenus.teacherStaffComm ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                    </button>
                                    {openMenus.teacherStaffComm && (
                                        <div className="pl-6 pt-1 space-y-1">
                                            <Link href="/dashboard/teacher/communication/staff" className={`block px-3 py-1.5 rounded-lg text-xs font-normal ${pathname.includes("staff") ? "bg-blue-50 text-[#4085b3]" : "text-gray-600 hover:bg-gray-50"}`}>
                                                School Announcements
                                            </Link>
                                            <Link href="/dashboard/teacher/communication/staff" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Department Communication
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 10: PROFESSIONAL DEVELOPMENT */}
                                <div className="pt-2">
                                    <button 
                                        onClick={() => toggleMenu("teacherPD")}
                                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-normal text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center space-x-2.5">
                                            <GraduationCap className="w-4 h-4 text-[#4085b3]" />
                                            <span>Professional Dev.</span>
                                        </div>
                                        {openMenus.teacherPD ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                    </button>
                                    {openMenus.teacherPD && (
                                        <div className="pl-6 pt-1 space-y-1">
                                            <Link href="/dashboard/teacher/pd" className={`block px-3 py-1.5 rounded-lg text-xs font-normal ${pathname === "/dashboard/teacher/pd" ? "bg-blue-50 text-[#4085b3]" : "text-gray-600 hover:bg-gray-50"}`}>
                                                Training & Workshops
                                            </Link>
                                            <Link href="/dashboard/teacher/pd" className="block px-3 py-1.5 rounded-lg text-xs font-normal text-gray-600 hover:bg-gray-50">
                                                Certificates
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 11: REPORTS */}
                                <div className="pt-2 pb-4">
                                    <button 
                                        onClick={() => toggleMenu("teacherReports")}
                                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-normal text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center space-x-2.5">
                                            <BarChart2 className="w-4 h-4 text-[#4085b3]" />
                                            <span>Teacher Reports</span>
                                        </div>
                                        {openMenus.teacherReports ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                    </button>
                                    {openMenus.teacherReports && (
                                        <div className="pl-6 pt-1 space-y-1">
                                            <Link href="/dashboard/teacher/reports" className={`block px-3 py-1.5 rounded-lg text-xs font-normal ${pathname === "/dashboard/teacher/reports" ? "bg-blue-50 text-[#4085b3]" : "text-gray-600 hover:bg-gray-50"}`}>
                                                Class Attendance & Scores
                                            </Link>
                                        </div>
                                    )}
                                </div>
                                {/* Section 12: SETTINGS */}
                                <div className="pt-4 border-t border-gray-100 mt-4 mb-4">
                                    <Link href="/dashboard/teacher/settings" className="flex items-center space-x-2.5 px-3 py-2 text-xs font-normal text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                        <Settings className="w-4 h-4 text-gray-500" />
                                        <span>Settings</span>
                                    </Link>
                                </div>
                            </nav>
                        </div>
                    </aside>
                ) : isStudentRoute ? (
                    <StudentNavigation />
                ) : (
                    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex overflow-y-auto">
                        <div className="p-4 pt-6">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-4 px-2">Navigation</p>
                            
                            <nav className="space-y-1">
                                {["ADMIN", "SCHOOL_ADMIN", "ADMINISTRATOR"].includes(roleName) && (
                                    <>
                                        <Link 
                                            href="/dashboard/admin" 
                                            className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${pathname === "/dashboard/admin" || pathname === "/dashboard" ? "bg-[#006b3f] text-white font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
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

                                        <Link 
                                            href="/dashboard/admin/users" 
                                            className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${pathname.startsWith("/dashboard/admin/users") ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <Users className="w-4 h-4 text-gray-500" />
                                                <span>User Management</span>
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
                                                    <Link href="/dashboard/attendance/overview" className={`block py-1.5 text-sm ${pathname === "/dashboard/attendance/overview" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Executive Overview</Link>
                                                    <Link href="/dashboard/attendance/student" className={`block py-1.5 text-sm ${pathname === "/dashboard/attendance/student" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Student Attendance</Link>
                                                    <Link href="/dashboard/attendance/teacher" className={`block py-1.5 text-sm ${pathname === "/dashboard/attendance/teacher" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Teacher Attendance</Link>
                                                    <Link href="/dashboard/attendance/alerts" className={`block py-1.5 text-sm ${pathname === "/dashboard/attendance/alerts" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Absence Risk Alerts</Link>
                                                    <Link href="/dashboard/attendance/corrections" className={`block py-1.5 text-sm ${pathname === "/dashboard/attendance/corrections" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Official Corrections</Link>
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
                                                    <Link href="/dashboard/assessment" className={`block py-1.5 text-sm ${pathname === "/dashboard/assessment" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Assessments Catalog</Link>
                                                    <Link href="/dashboard/assessment/schedules" className={`block py-1.5 text-sm ${pathname === "/dashboard/assessment/schedules" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Exam Schedules</Link>
                                                    <Link href="/dashboard/assessment/analytics" className={`block py-1.5 text-sm ${pathname === "/dashboard/assessment/analytics" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Performance Analytics</Link>
                                                    <Link href="/dashboard/assessment/at-risk" className={`block py-1.5 text-sm ${pathname === "/dashboard/assessment/at-risk" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Academic At-Risk List</Link>
                                                    <Link href="/dashboard/assessment/approval" className={`block py-1.5 text-sm ${pathname === "/dashboard/assessment/approval" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>Report Cards & Approval</Link>
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
                                                    <Link href="/dashboard/support/at-risk" className={`block py-1.5 text-sm ${pathname === "/dashboard/support/at-risk" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>1. At-Risk Students</Link>
                                                    <Link href="/dashboard/support/learning-difficulties" className={`block py-1.5 text-sm ${pathname === "/dashboard/support/learning-difficulties" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>2. Learning Difficulties</Link>
                                                    <Link href="/dashboard/support/remedial" className={`block py-1.5 text-sm ${pathname === "/dashboard/support/remedial" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>3. Remedial Programs</Link>
                                                    <Link href="/dashboard/support/enrichment" className={`block py-1.5 text-sm ${pathname === "/dashboard/support/enrichment" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>4. Enrichment Programs</Link>
                                                    <Link href="/dashboard/support/intervention-plans" className={`block py-1.5 text-sm ${pathname === "/dashboard/support/intervention-plans" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>5. Intervention Plans</Link>
                                                    <Link href="/dashboard/support/monitoring" className={`block py-1.5 text-sm ${pathname === "/dashboard/support/monitoring" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>6. Intervention Monitoring</Link>
                                                    <Link href="/dashboard/support/outcomes" className={`block py-1.5 text-sm ${pathname === "/dashboard/support/outcomes" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>7. Intervention Outcomes</Link>
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
                                                    <Link href="/dashboard/parents/accounts" className={`block py-1.5 text-sm ${pathname === "/dashboard/parents/accounts" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>1. Parent Accounts</Link>
                                                    <Link href="/dashboard/parents/relationships" className={`block py-1.5 text-sm ${pathname === "/dashboard/parents/relationships" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>2. Relationships</Link>
                                                    <Link href="/dashboard/parents/communication" className={`block py-1.5 text-sm ${pathname === "/dashboard/parents/communication" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>3. Parent Communication</Link>
                                                    <Link href="/dashboard/parents/meetings" className={`block py-1.5 text-sm ${pathname === "/dashboard/parents/meetings" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>4. Parent Meetings & PTA</Link>
                                                    <Link href="/dashboard/parents/notifications" className={`block py-1.5 text-sm ${pathname === "/dashboard/parents/notifications" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>5. Parent Notifications</Link>
                                                    <Link href="/dashboard/parents/participation" className={`block py-1.5 text-sm ${pathname === "/dashboard/parents/participation" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>6. Parent Participation</Link>
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
                                                    <Link href="/dashboard/communication/announcements" className={`block py-1.5 text-sm ${pathname === "/dashboard/communication/announcements" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>1. School Announcements</Link>
                                                    <Link href="/dashboard/communication/teacher" className={`block py-1.5 text-sm ${pathname === "/dashboard/communication/teacher" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>2. Teacher Communication</Link>
                                                    <Link href="/dashboard/communication/student" className={`block py-1.5 text-sm ${pathname === "/dashboard/communication/student" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>3. Student Communication</Link>
                                                    <Link href="/dashboard/communication/parent" className={`block py-1.5 text-sm ${pathname === "/dashboard/communication/parent" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>4. Parent Communication</Link>
                                                    <Link href="/dashboard/communication/staff" className={`block py-1.5 text-sm ${pathname === "/dashboard/communication/staff" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>5. Staff Communication</Link>
                                                    <Link href="/dashboard/communication/notices" className={`block py-1.5 text-sm ${pathname === "/dashboard/communication/notices" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>6. Important Notices</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* School Improvement Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => toggleMenu("improvement")}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <TrendingUp className="w-4 h-4 text-gray-500" />
                                                    <span>School Improvement</span>
                                                </div>
                                                {openMenus.improvement ? 
                                                    <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                }
                                            </button>
                                            {openMenus.improvement && (
                                                <div className="pl-10 pr-3 py-1 space-y-1">
                                                    <Link href="/dashboard/improvement/problems" className={`block py-1.5 text-sm ${pathname === "/dashboard/improvement/problems" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>1. Identify Problems</Link>
                                                    <Link href="/dashboard/improvement/priorities" className={`block py-1.5 text-sm ${pathname === "/dashboard/improvement/priorities" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>2. Improvement Priorities</Link>
                                                    <Link href="/dashboard/improvement/plans" className={`block py-1.5 text-sm ${pathname === "/dashboard/improvement/plans" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>3. Improvement Plans</Link>
                                                    <Link href="/dashboard/improvement/activities" className={`block py-1.5 text-sm ${pathname === "/dashboard/improvement/activities" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>4. Improvement Activities</Link>
                                                    <Link href="/dashboard/improvement/targets" className={`block py-1.5 text-sm ${pathname === "/dashboard/improvement/targets" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>5. KPI Targets</Link>
                                                    <Link href="/dashboard/improvement/monitoring" className={`block py-1.5 text-sm ${pathname === "/dashboard/improvement/monitoring" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>6. Progress Monitoring</Link>
                                                    <Link href="/dashboard/improvement/outcomes" className={`block py-1.5 text-sm ${pathname === "/dashboard/improvement/outcomes" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>7. Outcomes & Impact</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Reports & Analytics Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => toggleMenu("reports")}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <BarChart2 className="w-4 h-4 text-gray-500" />
                                                    <span>Reports & Analytics</span>
                                                </div>
                                                {openMenus.reports ? 
                                                    <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                }
                                            </button>
                                            {openMenus.reports && (
                                                <div className="pl-10 pr-3 py-1 space-y-1">
                                                    <Link href="/dashboard/reports/enrollment" className={`block py-1.5 text-sm ${pathname === "/dashboard/reports/enrollment" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>1. Enrollment Reports</Link>
                                                    <Link href="/dashboard/reports/attendance" className={`block py-1.5 text-sm ${pathname === "/dashboard/reports/attendance" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>2. Attendance Reports</Link>
                                                    <Link href="/dashboard/reports/teacher" className={`block py-1.5 text-sm ${pathname === "/dashboard/reports/teacher" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>3. Teacher Reports</Link>
                                                    <Link href="/dashboard/reports/assessment" className={`block py-1.5 text-sm ${pathname === "/dashboard/reports/assessment" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>4. Assessment Reports</Link>
                                                    <Link href="/dashboard/reports/performance" className={`block py-1.5 text-sm ${pathname === "/dashboard/reports/performance" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>5. Student Performance</Link>
                                                    <Link href="/dashboard/reports/curriculum" className={`block py-1.5 text-sm ${pathname === "/dashboard/reports/curriculum" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>6. Curriculum Progress</Link>
                                                    <Link href="/dashboard/reports/support" className={`block py-1.5 text-sm ${pathname === "/dashboard/reports/support" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>7. Student Support</Link>
                                                    <Link href="/dashboard/reports/school-performance" className={`block py-1.5 text-sm ${pathname === "/dashboard/reports/school-performance" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>8. School Performance</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* AI School Leadership Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => toggleMenu("aiLeadership")}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Brain className="w-4 h-4 text-purple-600" />
                                                    <span>AI School Leadership</span>
                                                </div>
                                                {openMenus.aiLeadership ? 
                                                    <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                }
                                            </button>
                                            {openMenus.aiLeadership && (
                                                <div className="pl-10 pr-3 py-1 space-y-1">
                                                    <Link href="/dashboard/ai-leadership/school-performance" className={`block py-1.5 text-sm ${pathname === "/dashboard/ai-leadership/school-performance" ? "text-purple-600 font-medium" : "text-gray-500 hover:text-purple-600"}`}>1. Performance Analysis</Link>
                                                    <Link href="/dashboard/ai-leadership/attendance" className={`block py-1.5 text-sm ${pathname === "/dashboard/ai-leadership/attendance" ? "text-purple-600 font-medium" : "text-gray-500 hover:text-purple-600"}`}>2. Attendance Modeling</Link>
                                                    <Link href="/dashboard/ai-leadership/student-risk" className={`block py-1.5 text-sm ${pathname === "/dashboard/ai-leadership/student-risk" ? "text-purple-600 font-medium" : "text-gray-500 hover:text-purple-600"}`}>3. Student-Risk Insights</Link>
                                                    <Link href="/dashboard/ai-leadership/performance-trends" className={`block py-1.5 text-sm ${pathname === "/dashboard/ai-leadership/performance-trends" ? "text-purple-600 font-medium" : "text-gray-500 hover:text-purple-600"}`}>4. Trend Detection</Link>
                                                    <Link href="/dashboard/ai-leadership/intervention" className={`block py-1.5 text-sm ${pathname === "/dashboard/ai-leadership/intervention" ? "text-purple-600 font-medium" : "text-gray-500 hover:text-purple-600"}`}>5. Intervention Analysis</Link>
                                                    <Link href="/dashboard/ai-leadership/improvement-recommendations" className={`block py-1.5 text-sm ${pathname === "/dashboard/ai-leadership/improvement-recommendations" ? "text-purple-600 font-medium" : "text-gray-500 hover:text-purple-600"}`}>6. SIP Recommendations</Link>
                                                    <Link href="/dashboard/ai-leadership/natural-language" className={`block py-1.5 text-sm ${pathname === "/dashboard/ai-leadership/natural-language" ? "text-purple-600 font-medium" : "text-gray-500 hover:text-purple-600"}`}>7. Natural-Language AI</Link>
                                                    <Link href="/dashboard/ai-leadership/executive-summaries" className={`block py-1.5 text-sm ${pathname === "/dashboard/ai-leadership/executive-summaries" ? "text-purple-600 font-medium" : "text-gray-500 hover:text-purple-600"}`}>8. Executive Summaries</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Users & Permissions Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => toggleMenu("usersPermissions")}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Lock className="w-4 h-4 text-[#006b3f]" />
                                                    <span>Users & Permissions</span>
                                                </div>
                                                {openMenus.usersPermissions ? 
                                                    <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                }
                                            </button>
                                            {openMenus.usersPermissions && (
                                                <div className="pl-10 pr-3 py-1 space-y-1">
                                                    <Link href="/dashboard/users-permissions/school-users" className={`block py-1.5 text-sm ${pathname === "/dashboard/users-permissions/school-users" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>1. School Users</Link>
                                                    <Link href="/dashboard/users-permissions/roles" className={`block py-1.5 text-sm ${pathname === "/dashboard/users-permissions/roles" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>2. Roles</Link>
                                                    <Link href="/dashboard/users-permissions/permissions" className={`block py-1.5 text-sm ${pathname === "/dashboard/users-permissions/permissions" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>3. Permissions</Link>
                                                    <Link href="/dashboard/users-permissions/teacher-accounts" className={`block py-1.5 text-sm ${pathname === "/dashboard/users-permissions/teacher-accounts" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>4. Teacher Accounts</Link>
                                                    <Link href="/dashboard/users-permissions/student-accounts" className={`block py-1.5 text-sm ${pathname === "/dashboard/users-permissions/student-accounts" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>5. Student Accounts</Link>
                                                    <Link href="/dashboard/users-permissions/parent-accounts" className={`block py-1.5 text-sm ${pathname === "/dashboard/users-permissions/parent-accounts" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>6. Parent Accounts</Link>
                                                    <Link href="/dashboard/users-permissions/staff-accounts" className={`block py-1.5 text-sm ${pathname === "/dashboard/users-permissions/staff-accounts" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>7. Staff Accounts</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* School Settings Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => toggleMenu("schoolSettings")}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Settings className="w-4 h-4 text-[#006b3f]" />
                                                    <span>School Settings</span>
                                                </div>
                                                {openMenus.schoolSettings ? 
                                                    <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                }
                                            </button>
                                            {openMenus.schoolSettings && (
                                                <div className="pl-10 pr-3 py-1 space-y-1">
                                                    <Link href="/dashboard/school-settings/school-configuration" className={`block py-1.5 text-sm ${pathname === "/dashboard/school-settings/school-configuration" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>1. School Config</Link>
                                                    <Link href="/dashboard/school-settings/academic-configuration" className={`block py-1.5 text-sm ${pathname === "/dashboard/school-settings/academic-configuration" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>2. Academic Config</Link>
                                                    <Link href="/dashboard/school-settings/notification-settings" className={`block py-1.5 text-sm ${pathname === "/dashboard/school-settings/notification-settings" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>3. Notification Rules</Link>
                                                    <Link href="/dashboard/school-settings/integrations" className={`block py-1.5 text-sm ${pathname === "/dashboard/school-settings/integrations" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>4. System Integrations</Link>
                                                    <Link href="/dashboard/school-settings/audit-activity" className={`block py-1.5 text-sm ${pathname === "/dashboard/school-settings/audit-activity" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>5. Audit Activity Log</Link>
                                                    <Link href="/dashboard/school-settings/data-management" className={`block py-1.5 text-sm ${pathname === "/dashboard/school-settings/data-management" ? "text-[#006b3f] font-medium" : "text-gray-500 hover:text-[#006b3f]"}`}>6. Data Management</Link>
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

