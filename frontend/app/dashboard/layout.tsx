"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Loader2, BookOpen, LogOut, LayoutDashboard, Building, Search, Lock, ChevronDown, ChevronRight, Calendar, Users, GraduationCap, ClipboardCheck, FileText, Settings, User, Megaphone, Bell, MessageSquare, Package, AlertOctagon, TrendingUp, HeartHandshake, BarChart2, Sparkles, Menu, Brain } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "../../lib/api";
import StudentNavigation from "./student/StudentNavigation";

function TeacherBreadcrumbs({ pathname, currentTab, currentType }: { pathname: string; currentTab: string; currentType: string }) {
    if (pathname === "/dashboard/teacher") {
        return (
            <div className="flex items-center space-x-2 text-xs text-gray-500 mb-4 pb-2 border-b border-gray-200/70 select-none">
                <LayoutDashboard className="w-3.5 h-3.5 text-[#4085b3]" />
                <span className="text-gray-900 font-bold">Teacher Dashboard</span>
            </div>
        );
    }

    // Determine Parent Module Title and Link based on route
    let parentTitle = "";
    let parentHref = "";
    let subItemTitle = "";

    if (pathname.startsWith("/dashboard/teacher/my-classes")) {
        parentTitle = "My Teaching Assignments";
        parentHref = "/dashboard/teacher/my-classes";
        const tabMap: Record<string, string> = {
            overview: "Class Overview",
            details: "Class Details",
            weekly: "Weekly Schedule",
            workload: "Teaching Workload",
            materials: "Course Materials"
        };
        if (currentTab && tabMap[currentTab]) {
            subItemTitle = tabMap[currentTab];
        }
    } else if (pathname.startsWith("/dashboard/teacher/operations")) {
        parentTitle = "Daily Operations";
        parentHref = "/dashboard/teacher/operations";
        const tabMap: Record<string, string> = {
            "quick-actions": "Quick Actions",
            "today-schedule": "Today's Schedule",
            substitutions: "Substitutions",
            reminders: "Reminders",
            "room-utilization": "Room Utilization"
        };
        if (currentTab && tabMap[currentTab]) {
            subItemTitle = tabMap[currentTab];
        }
    } else if (pathname.startsWith("/dashboard/teacher/attendance")) {
        parentTitle = "Student Attendance";
        parentHref = "/dashboard/teacher/attendance";
        const tabMap: Record<string, string> = {
            mark: "Mark Attendance",
            period: "Period Attendance",
            history: "Attendance History",
            repeated: "Repeated Absences",
            "daily-overview": "Daily Overview"
        };
        if (currentTab && tabMap[currentTab]) {
            subItemTitle = tabMap[currentTab];
        }
    } else if (pathname.startsWith("/dashboard/teacher/curriculum")) {
        parentTitle = "Lesson & Curriculum";
        parentHref = "/dashboard/teacher/curriculum";
        const tabMap: Record<string, string> = {
            view: "View Curriculum",
            progress: "Track Curriculum Progress",
            log: "Record Lesson Progress",
            topics: "Record Topics Covered",
            difficulties: "Record Learning Difficulties",
            notes: "Record Teaching Notes"
        };
        if (currentTab && tabMap[currentTab]) {
            subItemTitle = tabMap[currentTab];
        }
    } else if (pathname.startsWith("/dashboard/teacher/assessment")) {
        parentTitle = "Assessment & Grades";
        parentHref = "/dashboard/teacher/assessment";
        const typeMap: Record<string, string> = {
            ALL: "Create Assessment",
            QUIZ: "Create Quiz",
            TEST: "Create Test",
            ASSIGNMENT: "Create Assignment",
            PROJECT: "Create Project"
        };
        const tabMap: Record<string, string> = {
            conduct: "Conduct Assessment",
            grade: "Record Results & Grade",
            feedback: "Provide Feedback"
        };
        if (currentType && typeMap[currentType]) {
            subItemTitle = typeMap[currentType];
        } else if (currentTab && tabMap[currentTab]) {
            subItemTitle = tabMap[currentTab];
        }
    } else if (pathname.startsWith("/dashboard/teacher/learning") || pathname.startsWith("/dashboard/teacher/activities")) {
        parentTitle = "Learning Activities";
        parentHref = "/dashboard/teacher/learning";
        const typeMap: Record<string, string> = {
            HOMEWORK: "Create Assignment",
            QUIZ: "Create Quiz",
            CLASS_WORK: "Create Class Activity"
        };
        const tabMap: Record<string, string> = {
            create: "Set Deadline",
            submissions: "Review Submissions",
            completion: "Mark Completion",
            feedback: "Give Feedback"
        };
        if (currentType && typeMap[currentType]) {
            subItemTitle = typeMap[currentType];
        } else if (currentTab && tabMap[currentTab]) {
            subItemTitle = tabMap[currentTab];
        }
    } else if (pathname.startsWith("/dashboard/teacher/support")) {
        parentTitle = "Student Support & Advisory";
        parentHref = "/dashboard/teacher/support";
        const tabMap: Record<string, string> = {
            flag: "Flag At-Risk Student",
            interventions: "Monitor Interventions",
            referrals: "Counseling Referrals",
            homeroom: "Homeroom Advisory",
            "progress-reviews": "Periodic Reviews"
        };
        if (currentTab && tabMap[currentTab]) {
            subItemTitle = tabMap[currentTab];
        }
    } else if (pathname.startsWith("/dashboard/teacher/communication/parent")) {
        parentTitle = "Parent Communication";
        parentHref = "/dashboard/teacher/communication/parent";
        const tabMap: Record<string, string> = {
            messages: "Direct Messages",
            broadcasts: "Class Announcements",
            conferences: "Parent Meetings",
            logs: "Contact History"
        };
        if (currentTab && tabMap[currentTab]) {
            subItemTitle = tabMap[currentTab];
        }
    } else if (pathname.startsWith("/dashboard/teacher/communication/staff")) {
        parentTitle = "Staff Collaboration";
        parentHref = "/dashboard/teacher/communication/staff";
        const tabMap: Record<string, string> = {
            departments: "Department Meetings",
            "peer-sharing": "Lesson Sharing",
            "internal-messages": "Internal Staff Messages",
            committee: "Committee Work",
            handover: "Shift & Coverage"
        };
        if (currentTab && tabMap[currentTab]) {
            subItemTitle = tabMap[currentTab];
        }
    } else if (pathname.startsWith("/dashboard/teacher/pd")) {
        parentTitle = "Professional Development";
        parentHref = "/dashboard/teacher/pd";
        const tabMap: Record<string, string> = {
            trainings: "Training Modules",
            observations: "Peer Observations",
            goals: "Annual Goals",
            portfolio: "Teaching Portfolio",
            certifications: "Certificates & Badges"
        };
        if (currentTab && tabMap[currentTab]) {
            subItemTitle = tabMap[currentTab];
        }
    } else if (pathname.startsWith("/dashboard/teacher/reports")) {
        parentTitle = "Teacher Reports";
        parentHref = "/dashboard/teacher/reports";
        const tabMap: Record<string, string> = {
            "attendance-report": "Attendance Summary",
            "academic-report": "Academic Performance",
            "curriculum-report": "Curriculum Progress",
            "term-closing": "Term Closing Checklist",
            "export-center": "Report Export Center"
        };
        if (currentTab && tabMap[currentTab]) {
            subItemTitle = tabMap[currentTab];
        }
    } else if (pathname.startsWith("/dashboard/teacher/students")) {
        parentTitle = "Student Directory";
        parentHref = "/dashboard/teacher/students";
        const tabMap: Record<string, string> = {
            list: "Student List",
            profiles: "Student Profiles",
            groups: "Student Groups",
            "health-needs": "Health & Special Needs",
            transfers: "Transfers & Status"
        };
        if (currentTab && tabMap[currentTab]) {
            subItemTitle = tabMap[currentTab];
        }
    } else if (pathname.startsWith("/dashboard/teacher/settings")) {
        parentTitle = "Account Settings";
        parentHref = "/dashboard/teacher/settings";
    }

    if (!parentTitle) {
        const segments = pathname.replace("/dashboard/teacher/", "").split("/").filter(Boolean);
        if (segments.length > 0) {
            parentTitle = segments[0].charAt(0).toUpperCase() + segments[0].slice(1).replace(/-/g, " ");
            parentHref = `/dashboard/teacher/${segments[0]}`;
        }
    }

    return (
        <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-gray-500 mb-4 pb-2 border-b border-gray-200/70 select-none">
            <Link 
                href="/dashboard/teacher" 
                className="hover:text-[#4085b3] transition-colors flex items-center gap-1 font-medium"
                title="Go to Teacher Dashboard"
            >
                <LayoutDashboard className="w-3.5 h-3.5 text-[#4085b3]" />
                <span>Teacher Dashboard</span>
            </Link>

            {parentTitle && (
                <>
                    <span className="text-gray-300 font-bold">/</span>
                    {subItemTitle ? (
                        <Link 
                            href={parentHref} 
                            className="hover:text-[#4085b3] transition-colors font-medium text-gray-600"
                        >
                            {parentTitle}
                        </Link>
                    ) : (
                        <span className="text-gray-900 font-bold">{parentTitle}</span>
                    )}
                </>
            )}

            {subItemTitle && (
                <>
                    <span className="text-gray-300 font-bold">/</span>
                    <span className="text-gray-900 font-bold">{subItemTitle}</span>
                </>
            )}
        </nav>
    );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
    const { authData, loading, error } = useAuth(true);
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTab = searchParams?.get("tab") || "";
    const currentType = searchParams?.get("type") || "";

    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        dashboard: pathname === "/dashboard",
        academics: pathname.startsWith("/dashboard/academics"),
        students: pathname.startsWith("/dashboard/students"),
        teachers: pathname.startsWith("/dashboard/teachers"),
        attendance: pathname.startsWith("/dashboard/attendance"),
        teacherAssignments: pathname.startsWith("/dashboard/teacher/my-classes"),
        teacherAttendance: pathname.startsWith("/dashboard/teacher/attendance"),
        teacherCurriculum: pathname.startsWith("/dashboard/teacher/curriculum"),
        teacherAssessment: pathname.startsWith("/dashboard/teacher/assessment"),
        teacherActivities: pathname.startsWith("/dashboard/teacher/learning"),
        teacherSupport: pathname.startsWith("/dashboard/teacher/support"),
        teacherParentComm: pathname.startsWith("/dashboard/teacher/communication/parent"),
        teacherStaffComm: pathname.startsWith("/dashboard/teacher/communication/staff"),
        teacherPD: pathname.startsWith("/dashboard/teacher/pd"),
        teacherReports: pathname.startsWith("/dashboard/teacher/reports"),
        assessment: pathname.startsWith("/dashboard/assessment"),
        learning: pathname.startsWith("/dashboard/learning"),
        parents: pathname.startsWith("/dashboard/parents"),
        communication: pathname.startsWith("/dashboard/communication"),
        usersPermissions: pathname.startsWith("/dashboard/users-permissions"),
        operations: pathname.startsWith("/dashboard/operations"),
    });
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
                <Loader2 className="h-8 w-8 animate-spin text-[#4085b3] mr-3" />
                <span className="text-lg font-medium">Verifying access...</span>
            </div>
        );
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
        const isAdmin = ["ADMIN", "SCHOOL_ADMIN", "ADMINISTRATOR", "PRINCIPAL"].includes(roleName);

        // 0. The root /dashboard and /dashboard/admin are the School Administrator / Principal Dashboard
        if (pathname === "/dashboard" || pathname === "/dashboard/admin") {
            return isAdmin;
        }

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
                case "ADMINISTRATOR":
                case "PRINCIPAL": return "/dashboard/admin";
                case "TEACHER": return "/dashboard/teacher";
                case "STUDENT": return "/dashboard/student";
                case "PARENT": return "/dashboard/parent";
                case "VICE_PRINCIPAL": return "/dashboard/vice-principal";
                default: return "/dashboard/admin";
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
                                    <p className="font-bold text-gray-900 text-xs">{authData?.user?.name || "System Administrator"}</p>
                                    <p className="text-[10px] text-gray-500 truncate">{authData?.user?.email || "admin@edubridge.local"}</p>
                                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-[#4085b3] rounded font-bold text-[9px]">
                                        {isTeacherRoute ? "TEACHER ROLE" : roleName}
                                    </span>
                                </div>

                                {/* Teacher-specific Links */}
                                {isTeacherRoute && (
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
                                )}

                                {/* Logout button */}
                                <div className={`${isTeacherRoute ? "border-t border-gray-100 pt-1 mt-1" : "pt-1"}`}>
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
                    <aside
                        className={`bg-[#041738] border-r border-[#092254] flex flex-col hidden md:flex overflow-y-auto text-slate-300 font-sans shadow-xl shrink-0 transition-all duration-300 ease-in-out ${sidebarCollapsed ? "w-16" : "w-64"}`}
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
                    >
                        {/* Sidebar Header with collapse toggle */}
                        <div className="flex items-center justify-between px-3 pt-4 pb-2 border-b border-[#092254]/60">
                            {!sidebarCollapsed && (
                                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest px-1">Teacher Workspace</p>
                            )}
                            <button
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                                className={`flex items-center justify-center w-7 h-7 rounded-lg bg-[#092254] hover:bg-[#0c2d68] text-slate-400 hover:text-amber-400 transition-all cursor-pointer ${sidebarCollapsed ? "mx-auto" : "ml-auto"}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    {sidebarCollapsed
                                        ? <><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></>  
                                        : <><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></>
                                    }
                                </svg>
                            </button>
                        </div>
                        <div className="p-3 pt-3 flex-1">
                            <nav className="space-y-1">
                                {/* Dashboard */}
                                <Link 
                                    href="/dashboard/teacher"
                                    title="Dashboard"
                                    className={`flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                        pathname === "/dashboard/teacher" 
                                            ? "bg-[#0c2454] text-[#f59e0b] border-l-4 border-[#f59e0b] shadow-inner" 
                                            : "text-slate-300 hover:bg-[#081e48] hover:text-white"
                                    }`}
                                >
                                    <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                        <LayoutDashboard className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/teacher" ? "text-[#f59e0b]" : "text-amber-400"}`} />
                                        {!sidebarCollapsed && <span>Dashboard</span>}
                                    </div>
                                </Link>

                                {/* Section 1: TEACHING ASSIGNMENTS */}
                                <div className="pt-1">
                                    <button 
                                        onClick={() => !sidebarCollapsed && toggleMenu("teacherAssignments")}
                                        title="My Teaching Assignments"
                                        className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                    >
                                        <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                            <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                                            {!sidebarCollapsed && <span>My Teaching Assignments</span>}
                                        </div>
                                        {!sidebarCollapsed && (openMenus.teacherAssignments ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />)}
                                    </button>
                                    {openMenus.teacherAssignments && !sidebarCollapsed && (
                                        <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                            <Link href="/dashboard/teacher/my-classes?tab=subjects" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/my-classes" && currentTab === "subjects" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Subjects</Link>
                                            <Link href="/dashboard/teacher/my-classes?tab=grades" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/my-classes" && currentTab === "grades" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Grades</Link>
                                            <Link href="/dashboard/teacher/my-classes?tab=sections" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/my-classes" && currentTab === "sections" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Sections</Link>
                                            <Link href="/dashboard/teacher/my-classes?tab=classes" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/my-classes" && currentTab === "classes" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Classes</Link>
                                            <Link href="/dashboard/teacher/my-classes?tab=schedule" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/my-classes" && currentTab === "schedule" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Teaching Schedule</Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 2: STUDENT MANAGEMENT */}
                                <div className="pt-1">
                                    <Link 
                                        href="/dashboard/teacher/students"
                                        title="Student Management"
                                        className={`flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium transition-all ${
                                            pathname === "/dashboard/teacher/students" 
                                                ? "bg-[#0c2454] text-[#f59e0b] border-l-4 border-[#f59e0b]" 
                                                : "text-slate-300 hover:bg-[#081e48] hover:text-white"
                                        }`}
                                    >
                                        <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                            <Users className="w-4 h-4 text-amber-400 shrink-0" />
                                            {!sidebarCollapsed && <span>Student Management</span>}
                                        </div>
                                    </Link>
                                </div>

                                {/* Section 3: ATTENDANCE */}
                                <div className="pt-1">
                                    <button 
                                        onClick={() => !sidebarCollapsed && toggleMenu("teacherAttendance")}
                                        title="Attendance"
                                        className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                    >
                                        <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                            <ClipboardCheck className="w-4 h-4 text-amber-400 shrink-0" />
                                            {!sidebarCollapsed && <span>Attendance</span>}
                                        </div>
                                        {!sidebarCollapsed && (openMenus.teacherAttendance ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />)}
                                    </button>
                                    {openMenus.teacherAttendance && !sidebarCollapsed && (
                                        <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                            <Link href="/dashboard/teacher/attendance?tab=take" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/attendance" && (currentTab === "take" || !searchParams?.get("tab")) ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Take Student Attendance</Link>
                                            <Link href="/dashboard/teacher/attendance?tab=history" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/attendance" && currentTab === "history" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>View Attendance History</Link>
                                            <Link href="/dashboard/teacher/attendance?tab=reasons" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/attendance" && currentTab === "reasons" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Record Absence Reason</Link>
                                            <Link href="/dashboard/teacher/attendance?tab=repeated" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/attendance" && currentTab === "repeated" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Identify Repeated Absences</Link>
                                            <Link href="/dashboard/teacher/attendance?tab=report" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/attendance" && currentTab === "report" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Report Attendance Problems</Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 4: LESSON / CURRICULUM */}
                                <div className="pt-1">
                                    <button 
                                        onClick={() => !sidebarCollapsed && toggleMenu("teacherCurriculum")}
                                        title="Lesson / Curriculum"
                                        className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                    >
                                        <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                            <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                                            {!sidebarCollapsed && <span>Lesson / Curriculum</span>}
                                        </div>
                                        {!sidebarCollapsed && (openMenus.teacherCurriculum ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />)}
                                    </button>
                                    {openMenus.teacherCurriculum && !sidebarCollapsed && (
                                        <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                            <Link href="/dashboard/teacher/curriculum?tab=view" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/curriculum" && currentTab === "view" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>View Curriculum</Link>
                                            <Link href="/dashboard/teacher/curriculum?tab=log" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/curriculum" && currentTab === "log" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Record Lesson Progress</Link>
                                            <Link href="/dashboard/teacher/curriculum?tab=topics" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/curriculum" && currentTab === "topics" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Record Topics Covered</Link>
                                            <Link href="/dashboard/teacher/curriculum?tab=progress" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/curriculum" && currentTab === "progress" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Track Curriculum Progress</Link>
                                            <Link href="/dashboard/teacher/curriculum?tab=difficulties" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/curriculum" && currentTab === "difficulties" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Record Learning Difficulties</Link>
                                            <Link href="/dashboard/teacher/curriculum?tab=notes" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/curriculum" && currentTab === "notes" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Record Teaching Notes</Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 5: ASSESSMENT */}
                                <div className="pt-1">
                                    <button 
                                        onClick={() => !sidebarCollapsed && toggleMenu("teacherAssessment")}
                                        title="Assessment & Grades"
                                        className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                    >
                                        <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                            <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
                                            {!sidebarCollapsed && <span>Assessment & Grades</span>}
                                        </div>
                                        {!sidebarCollapsed && (openMenus.teacherAssessment ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />)}
                                    </button>
                                    {openMenus.teacherAssessment && !sidebarCollapsed && (
                                        <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                            <Link href="/dashboard/teacher/assessment?type=ALL" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/assessment" && currentType === "ALL" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Create Assessment</Link>
                                            <Link href="/dashboard/teacher/assessment?type=QUIZ" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/assessment" && currentType === "QUIZ" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Create Quiz</Link>
                                            <Link href="/dashboard/teacher/assessment?type=TEST" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/assessment" && currentType === "TEST" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Create Test</Link>
                                            <Link href="/dashboard/teacher/assessment?type=ASSIGNMENT" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/assessment" && currentType === "ASSIGNMENT" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Create Assignment</Link>
                                            <Link href="/dashboard/teacher/assessment?type=PROJECT" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/assessment" && currentType === "PROJECT" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Create Project</Link>
                                            <Link href="/dashboard/teacher/assessment?tab=conduct" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/assessment" && currentTab === "conduct" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Conduct Assessment</Link>
                                            <Link href="/dashboard/teacher/assessment?tab=grade" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/assessment" && currentTab === "grade" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Record Results & Grade</Link>
                                            <Link href="/dashboard/teacher/assessment?tab=feedback" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/assessment" && currentTab === "feedback" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Provide Feedback</Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 6: LEARNING ACTIVITIES */}
                                <div className="pt-1">
                                    <button 
                                        onClick={() => !sidebarCollapsed && toggleMenu("teacherActivities")}
                                        title="Learning Activities"
                                        className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                    >
                                        <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                            <ClipboardCheck className="w-4 h-4 text-amber-400 shrink-0" />
                                            {!sidebarCollapsed && <span>Learning Activities</span>}
                                        </div>
                                        {!sidebarCollapsed && (openMenus.teacherActivities ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />)}
                                    </button>
                                    {openMenus.teacherActivities && !sidebarCollapsed && (
                                        <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                            <Link href="/dashboard/teacher/learning?type=HOMEWORK" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/learning" && currentType === "HOMEWORK" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Create Assignment</Link>
                                            <Link href="/dashboard/teacher/learning?type=QUIZ" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/learning" && currentType === "QUIZ" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Create Quiz</Link>
                                            <Link href="/dashboard/teacher/learning?type=CLASS_WORK" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/learning" && currentType === "CLASS_WORK" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Create Class Activity</Link>
                                            <Link href="/dashboard/teacher/learning?tab=create" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/learning" && currentTab === "create" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Set Deadline</Link>
                                            <Link href="/dashboard/teacher/learning?tab=submissions" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/learning" && currentTab === "submissions" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Review Submissions</Link>
                                            <Link href="/dashboard/teacher/learning?tab=completion" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/learning" && currentTab === "completion" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Mark Completion</Link>
                                            <Link href="/dashboard/teacher/learning?tab=feedback" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/learning" && currentTab === "feedback" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Give Feedback</Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 7: STUDENT SUPPORT */}
                                <div className="pt-1">
                                    <button 
                                        onClick={() => !sidebarCollapsed && toggleMenu("teacherSupport")}
                                        title="Student Support"
                                        className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                    >
                                        <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                            <HeartHandshake className="w-4 h-4 text-amber-400 shrink-0" />
                                            {!sidebarCollapsed && <span>Student Support</span>}
                                        </div>
                                        {!sidebarCollapsed && (openMenus.teacherSupport ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />)}
                                    </button>
                                    {openMenus.teacherSupport && !sidebarCollapsed && (
                                        <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                            <Link href="/dashboard/teacher/support?tab=flag" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/support" && (currentTab === "flag" || currentTab === "") ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Flag At-Risk Student</Link>
                                            <Link href="/dashboard/teacher/support?tab=interventions" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/support" && currentTab === "interventions" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Monitor Interventions</Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 8: PARENT COMMUNICATION */}
                                <div className="pt-1">
                                    <button 
                                        onClick={() => !sidebarCollapsed && toggleMenu("teacherParentComm")}
                                        title="Parent Communication"
                                        className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                    >
                                        <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                            <Users className="w-4 h-4 text-amber-400 shrink-0" />
                                            {!sidebarCollapsed && <span>Parent Communication</span>}
                                        </div>
                                        {!sidebarCollapsed && (openMenus.teacherParentComm ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />)}
                                    </button>
                                    {openMenus.teacherParentComm && !sidebarCollapsed && (
                                        <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                            <Link href="/dashboard/teacher/communication/parent?tab=message" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname.includes("/communication/parent") && (currentTab === "message" || currentTab === "") ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Send Parent Message</Link>
                                            <Link href="/dashboard/teacher/communication/parent?tab=notifications" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname.includes("/communication/parent") && currentTab === "notifications" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Attendance Notifications</Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 9: STAFF COMMUNICATION */}
                                <div className="pt-1">
                                    <button 
                                        onClick={() => !sidebarCollapsed && toggleMenu("teacherStaffComm")}
                                        title="Teacher Communication"
                                        className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                    >
                                        <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                            <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
                                            {!sidebarCollapsed && <span>Teacher Communication</span>}
                                        </div>
                                        {!sidebarCollapsed && (openMenus.teacherStaffComm ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />)}
                                    </button>
                                    {openMenus.teacherStaffComm && !sidebarCollapsed && (
                                        <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                            <Link href="/dashboard/teacher/communication/staff?tab=announcements" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname.includes("/communication/staff") && (currentTab === "announcements" || currentTab === "") ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>School Announcements</Link>
                                            <Link href="/dashboard/teacher/communication/staff?tab=department" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname.includes("/communication/staff") && currentTab === "department" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Department Communication</Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 10: PROFESSIONAL DEVELOPMENT */}
                                <div className="pt-1">
                                    <button 
                                        onClick={() => !sidebarCollapsed && toggleMenu("teacherPD")}
                                        title="Professional Development"
                                        className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                    >
                                        <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                            <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
                                            {!sidebarCollapsed && <span>Professional Dev.</span>}
                                        </div>
                                        {!sidebarCollapsed && (openMenus.teacherPD ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />)}
                                    </button>
                                    {openMenus.teacherPD && !sidebarCollapsed && (
                                        <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                            <Link href="/dashboard/teacher/pd?tab=training" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/pd" && (currentTab === "training" || currentTab === "") ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Training & Workshops</Link>
                                            <Link href="/dashboard/teacher/pd?tab=certificates" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/pd" && currentTab === "certificates" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Certificates</Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 11: REPORTS */}
                                <div className="pt-1">
                                    <button 
                                        onClick={() => !sidebarCollapsed && toggleMenu("teacherReports")}
                                        title="Teacher Reports"
                                        className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                    >
                                        <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                            <BarChart2 className="w-4 h-4 text-amber-400 shrink-0" />
                                            {!sidebarCollapsed && <span>Teacher Reports</span>}
                                        </div>
                                        {!sidebarCollapsed && (openMenus.teacherReports ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />)}
                                    </button>
                                    {openMenus.teacherReports && !sidebarCollapsed && (
                                        <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                            <Link href="/dashboard/teacher/reports" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teacher/reports" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Class Attendance & Scores</Link>
                                        </div>
                                    )}
                                </div>

                                {/* Section 12: AI TEACHER ASSISTANT (Inactive / Coming Soon) */}
                                <div className="pt-1">
                                    <div 
                                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-500 bg-[#020e24]/30 cursor-not-allowed select-none"
                                        title="AI Teacher Assistant feature is under development"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                                            <span>AI Teacher Assistant</span>
                                        </div>
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded-md uppercase tracking-wider">
                                            Soon
                                        </span>
                                    </div>
                                </div>

                                {/* Settings */}
                                <div className="pt-4 border-t border-[#092254]/60 mt-4 mb-4">
                                    <Link 
                                        href="/dashboard/teacher/settings"
                                        title="Settings"
                                        className={`flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium transition-all ${
                                            pathname === "/dashboard/teacher/settings"
                                                ? "bg-[#0c2454] text-[#f59e0b] border-l-4 border-[#f59e0b]"
                                                : "text-slate-300 hover:bg-[#081e48] hover:text-white"
                                        }`}
                                    >
                                        <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                            <Settings className="w-4 h-4 text-amber-400 shrink-0" />
                                            {!sidebarCollapsed && <span>Settings</span>}
                                        </div>
                                    </Link>
                                </div>
                            </nav>
                        </div>
                    </aside>
                ) : isStudentRoute ? (
                    <StudentNavigation />
                ) : (
                    <aside
                        className={`bg-[#041738] border-r border-[#092254] flex flex-col hidden md:flex overflow-y-auto scrollbar-hide text-slate-300 font-sans shadow-xl shrink-0 transition-all duration-300 ease-in-out ${sidebarCollapsed ? "w-16" : "w-64"}`}
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
                    >
                        {/* Sidebar Header with collapse toggle */}
                        <div className="flex items-center justify-between px-3 pt-4 pb-2 border-b border-[#092254]/60">
                            {!sidebarCollapsed && (
                                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest px-1">Navigation</p>
                            )}
                            <button
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                                className={`flex items-center justify-center w-7 h-7 rounded-lg bg-[#092254] hover:bg-[#0c2d68] text-slate-400 hover:text-amber-400 transition-all cursor-pointer ${sidebarCollapsed ? "mx-auto" : "ml-auto"}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    {sidebarCollapsed
                                        ? <><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></>  
                                        : <><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></>
                                    }
                                </svg>
                            </button>
                        </div>
                        <div className="p-3 pt-3 flex-1">
                            
                            <nav className="space-y-1">
                                {["ADMIN", "SCHOOL_ADMIN", "ADMINISTRATOR", "PRINCIPAL"].includes(roleName) && (
                                    <>
                                        {/* Dashboard */}
                                        <Link 
                                            href="/dashboard/admin" 
                                            title="Dashboard"
                                            className={`flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-semibold transition-all ${pathname === "/dashboard" || pathname === "/dashboard/admin" ? "bg-[#0c2454] text-[#f59e0b] border-l-4 border-[#f59e0b] shadow-inner" : "text-slate-300 hover:bg-[#081e48] hover:text-white"}`}
                                        >
                                            <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                                <LayoutDashboard className={`w-4 h-4 shrink-0 ${pathname === "/dashboard" || pathname === "/dashboard/admin" ? "text-[#f59e0b]" : "text-amber-400"}`} />
                                                {!sidebarCollapsed && <span>Dashboard</span>}
                                            </div>
                                        </Link>

                                        {/* School Profile */}
                                        <Link 
                                            href="/dashboard/school/profile"
                                            title="School Profile"
                                            className={`flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium transition-all ${pathname === "/dashboard/school/profile" ? "bg-[#0c2454] text-[#f59e0b] border-l-4 border-[#f59e0b]" : "text-slate-300 hover:bg-[#081e48] hover:text-white"}`}
                                        >
                                            <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                                <Building className="w-4 h-4 text-amber-400 shrink-0" />
                                                {!sidebarCollapsed && <span>School Profile</span>}
                                            </div>
                                        </Link>


                                        {/* Academics Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => !sidebarCollapsed && toggleMenu("academics")}
                                                title="Academics"
                                                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                            >
                                                <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                                    <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                                                    {!sidebarCollapsed && <span>Academics</span>}
                                                </div>
                                                {!sidebarCollapsed && (openMenus.academics ? 
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : 
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                                                )}
                                            </button>
                                            {openMenus.academics && !sidebarCollapsed && (
                                                <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                                    <Link href="/dashboard/academics/years" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/academics/years" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Academic Years</Link>
                                                    <Link href="/dashboard/academics/grades" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname.startsWith("/dashboard/academics/grades") ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Grades & Sections</Link>
                                                    <Link href="/dashboard/academics/subjects" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname.startsWith("/dashboard/academics/subjects") ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Subjects</Link>
                                                    <Link href="/dashboard/academics/calendar" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname.startsWith("/dashboard/academics/calendar") ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Academic Calendar</Link>
                                                    <Link href="/dashboard/academics/timetable" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname.startsWith("/dashboard/academics/timetable") ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Instructional Timetable</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Students Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => !sidebarCollapsed && toggleMenu("students")}
                                                title="Students"
                                                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                            >
                                                <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                                    <Users className="w-4 h-4 text-amber-400 shrink-0" />
                                                    {!sidebarCollapsed && <span>Students</span>}
                                                </div>
                                                {!sidebarCollapsed && (openMenus.students ? 
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : 
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                                                )}
                                            </button>
                                            {openMenus.students && !sidebarCollapsed && (
                                                <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                                    <Link href="/dashboard/students" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/students" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>All Students</Link>
                                                    <Link href="/dashboard/students/enrollments" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname.startsWith("/dashboard/students/enrollments") ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Student Enrollments</Link>
                                                    <Link href="/dashboard/students/placement" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname.startsWith("/dashboard/students/placement") ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Classroom Placement</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Teachers Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => !sidebarCollapsed && toggleMenu("teachers")}
                                                title="Teachers"
                                                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                            >
                                                <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                                    <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
                                                    {!sidebarCollapsed && <span>Teachers</span>}
                                                </div>
                                                {!sidebarCollapsed && (openMenus.teachers ? 
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : 
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                                                )}
                                            </button>
                                            {openMenus.teachers && !sidebarCollapsed && (
                                                <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                                    <Link href="/dashboard/teachers" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/teachers" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>All Teachers</Link>
                                                    <Link href="/dashboard/teachers/assignments" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname.startsWith("/dashboard/teachers/assignments") ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Teaching Assignments</Link>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Attendance Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => !sidebarCollapsed && toggleMenu("attendance")}
                                                title="Attendance"
                                                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                            >
                                                <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                                    <ClipboardCheck className="w-4 h-4 text-amber-400 shrink-0" />
                                                    {!sidebarCollapsed && <span>Attendance</span>}
                                                </div>
                                                {!sidebarCollapsed && (openMenus.attendance ? 
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : 
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                                                )}
                                            </button>
                                            {openMenus.attendance && !sidebarCollapsed && (
                                                <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                                    <Link href="/dashboard/attendance/overview" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/attendance/overview" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Executive Overview</Link>
                                                    <Link href="/dashboard/attendance/student" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/attendance/student" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Student Attendance</Link>
                                                    <Link href="/dashboard/attendance/teacher" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/attendance/teacher" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Teacher Attendance</Link>
                                                    <Link href="/dashboard/attendance/alerts" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/attendance/alerts" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Absence Risk Alerts</Link>
                                                    <Link href="/dashboard/attendance/corrections" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/attendance/corrections" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Official Corrections</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Assessment Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => !sidebarCollapsed && toggleMenu("assessment")}
                                                title="Assessment"
                                                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                            >
                                                <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                                    <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                                                    {!sidebarCollapsed && <span>Assessment</span>}
                                                </div>
                                                {!sidebarCollapsed && (openMenus.assessment ? 
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : 
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                                                )}
                                            </button>
                                            {openMenus.assessment && !sidebarCollapsed && (
                                                <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                                    <Link href="/dashboard/assessment" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/assessment" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Overview & Performance</Link>
                                                    <Link href="/dashboard/assessment/results" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname.startsWith("/dashboard/assessment/results") ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Student Results</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Learning Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => !sidebarCollapsed && toggleMenu("learning")}
                                                title="Learning & Support"
                                                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                            >
                                                <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                                    <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                                                    {!sidebarCollapsed && <span>Learning & Support</span>}
                                                </div>
                                                {!sidebarCollapsed && (openMenus.learning ? 
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : 
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                                                )}
                                            </button>
                                            {openMenus.learning && !sidebarCollapsed && (
                                                <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                                    <Link href="/dashboard/support/at-risk" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/support/at-risk" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>1. At-Risk Students</Link>
                                                    <Link href="/dashboard/support/learning-difficulties" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/support/learning-difficulties" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>2. Learning Difficulties</Link>
                                                    <Link href="/dashboard/support/remedial" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/support/remedial" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>3. Remedial Programs</Link>
                                                    <Link href="/dashboard/support/enrichment" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/support/enrichment" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>4. Enrichment Programs</Link>
                                                    <Link href="/dashboard/support/intervention-plans" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/support/intervention-plans" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>5. Intervention Plans</Link>
                                                    <Link href="/dashboard/support/monitoring" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/support/monitoring" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>6. Intervention Monitoring</Link>
                                                    <Link href="/dashboard/support/outcomes" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/support/outcomes" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>7. Intervention Outcomes</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Parents Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => !sidebarCollapsed && toggleMenu("parents")}
                                                title="Parents"
                                                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                            >
                                                <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                                    <Users className="w-4 h-4 text-amber-400 shrink-0" />
                                                    {!sidebarCollapsed && <span>Parents</span>}
                                                </div>
                                                {!sidebarCollapsed && (openMenus.parents ? 
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : 
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                                                )}
                                            </button>
                                            {openMenus.parents && !sidebarCollapsed && (
                                                <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                                    <Link href="/dashboard/parents" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname.startsWith("/dashboard/parents") ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Guardians & Relationships</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Communication Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => !sidebarCollapsed && toggleMenu("communication")}
                                                title="Communication"
                                                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                            >
                                                <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                                    <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
                                                    {!sidebarCollapsed && <span>Communication</span>}
                                                </div>
                                                {!sidebarCollapsed && (openMenus.communication ? 
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : 
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                                                )}
                                            </button>
                                            {openMenus.communication && !sidebarCollapsed && (
                                                <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                                    <Link href="/dashboard/communication/announcements" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/communication/announcements" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Announcements</Link>
                                                    <Link href="/dashboard/communication/notices" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/communication/notices" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Important Notices</Link>
                                                    <Link href="/dashboard/communication/messages" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/communication/messages" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Direct Messages</Link>
                                                    <Link href="/dashboard/communication/notifications" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/communication/notifications" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Notifications</Link>
                                                    <Link href="/dashboard/communication/teacher" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/communication/teacher" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Faculty Circulars</Link>
                                                    <Link href="/dashboard/communication/student" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/communication/student" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Student Broadcasts</Link>
                                                    <Link href="/dashboard/communication/parent" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/communication/parent" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Parent Broadcasts</Link>
                                                    <Link href="/dashboard/communication/staff" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/communication/staff" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Staff Circulars</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* School Improvement Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => !sidebarCollapsed && toggleMenu("improvement")}
                                                title="School Improvement"
                                                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                            >
                                                <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                                    <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
                                                    {!sidebarCollapsed && <span>School Improvement</span>}
                                                </div>
                                                {!sidebarCollapsed && (openMenus.improvement ? 
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : 
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                                                )}
                                            </button>
                                            {openMenus.improvement && !sidebarCollapsed && (
                                                <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                                    <Link href="/dashboard/improvement/problems" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/improvement/problems" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>1. Identify Problems</Link>
                                                    <Link href="/dashboard/improvement/priorities" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/improvement/priorities" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>2. Improvement Priorities</Link>
                                                    <Link href="/dashboard/improvement/plans" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/improvement/plans" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>3. Improvement Plans</Link>
                                                    <Link href="/dashboard/improvement/activities" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/improvement/activities" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>4. Improvement Activities</Link>
                                                    <Link href="/dashboard/improvement/targets" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/improvement/targets" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>5. KPI Targets</Link>
                                                    <Link href="/dashboard/improvement/monitoring" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/improvement/monitoring" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>6. Progress Monitoring</Link>
                                                    <Link href="/dashboard/improvement/outcomes" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/improvement/outcomes" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>7. Outcomes & Impact</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Reports & Analytics Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => !sidebarCollapsed && toggleMenu("reports")}
                                                title="Reports & Analytics"
                                                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                            >
                                                <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                                    <BarChart2 className="w-4 h-4 text-amber-400 shrink-0" />
                                                    {!sidebarCollapsed && <span>Reports & Analytics</span>}
                                                </div>
                                                {!sidebarCollapsed && (openMenus.reports ? 
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : 
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                                                )}
                                            </button>
                                            {openMenus.reports && !sidebarCollapsed && (
                                                <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                                    <Link href="/dashboard/reports/enrollment" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/reports/enrollment" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>1. Enrollment Reports</Link>
                                                    <Link href="/dashboard/reports/attendance" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/reports/attendance" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>2. Attendance Reports</Link>
                                                    <Link href="/dashboard/reports/teacher" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/reports/teacher" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>3. Teacher Reports</Link>
                                                    <Link href="/dashboard/reports/assessment" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/reports/assessment" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>4. Assessment Reports</Link>
                                                    <Link href="/dashboard/reports/performance" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/reports/performance" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>5. Student Performance</Link>
                                                    <Link href="/dashboard/reports/curriculum" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/reports/curriculum" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>6. Curriculum Progress</Link>
                                                    <Link href="/dashboard/reports/support" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/reports/support" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>7. Student Support</Link>
                                                    <Link href="/dashboard/reports/school-performance" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/reports/school-performance" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>8. School Performance</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* AI School Leadership Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => !sidebarCollapsed && toggleMenu("aiLeadership")}
                                                title="AI School Leadership"
                                                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                            >
                                                <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                                    <Brain className="w-4 h-4 text-purple-400 shrink-0" />
                                                    {!sidebarCollapsed && <span>AI School Leadership</span>}
                                                </div>
                                                {!sidebarCollapsed && (openMenus.aiLeadership ? 
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : 
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                                                )}
                                            </button>
                                            {openMenus.aiLeadership && !sidebarCollapsed && (
                                                <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                                    <Link href="/dashboard/ai-leadership/school-performance" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/ai-leadership/school-performance" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>1. Performance Analysis</Link>
                                                    <Link href="/dashboard/ai-leadership/attendance" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/ai-leadership/attendance" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>2. Attendance Modeling</Link>
                                                    <Link href="/dashboard/ai-leadership/student-risk" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/ai-leadership/student-risk" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>3. Student-Risk Insights</Link>
                                                    <Link href="/dashboard/ai-leadership/performance-trends" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/ai-leadership/performance-trends" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>4. Trend Detection</Link>
                                                    <Link href="/dashboard/ai-leadership/intervention" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/ai-leadership/intervention" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>5. Intervention Analysis</Link>
                                                    <Link href="/dashboard/ai-leadership/improvement-recommendations" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/ai-leadership/improvement-recommendations" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>6. SIP Recommendations</Link>
                                                    <Link href="/dashboard/ai-leadership/natural-language" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/ai-leadership/natural-language" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>7. Natural-Language AI</Link>
                                                    <Link href="/dashboard/ai-leadership/executive-summaries" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/ai-leadership/executive-summaries" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>8. Executive Summaries</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Users & Permissions Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => !sidebarCollapsed && toggleMenu("usersPermissions")}
                                                title="Users & Permissions"
                                                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer`}
                                            >
                                                <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-3"}`}>
                                                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                                                    {!sidebarCollapsed && <span>Users & Permissions</span>}
                                                </div>
                                                {!sidebarCollapsed && (openMenus.usersPermissions ? 
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : 
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                                                )}
                                            </button>
                                            {openMenus.usersPermissions && !sidebarCollapsed && (
                                                <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                                    <Link href="/dashboard/users-permissions" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/users-permissions" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>All Accounts</Link>
                                                    <Link href="/dashboard/users-permissions/administrators" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/users-permissions/administrators" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Administrators & Leadership</Link>
                                                    <Link href="/dashboard/users-permissions/teachers" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/users-permissions/teachers" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Teachers</Link>
                                                    <Link href="/dashboard/users-permissions/students" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/users-permissions/students" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Students</Link>
                                                    <Link href="/dashboard/users-permissions/parents" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/users-permissions/parents" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Parents & Guardians</Link>
                                                    <Link href="/dashboard/users-permissions/staff" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/users-permissions/staff" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Support Staff</Link>
                                                    <Link href="/dashboard/users-permissions/roles" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/users-permissions/roles" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Roles & Permissions</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* School Settings Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => toggleMenu("schoolSettings")}
                                                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Settings className="w-4 h-4 text-amber-400" />
                                                    <span>School Settings</span>
                                                </div>
                                                {openMenus.schoolSettings ? 
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : 
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                                                }
                                            </button>
                                            {openMenus.schoolSettings && (
                                                <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                                    <Link href="/dashboard/school-settings/school-configuration" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/school-settings/school-configuration" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>1. School Config</Link>
                                                    <Link href="/dashboard/school-settings/academic-configuration" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/school-settings/academic-configuration" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>2. Academic Config</Link>
                                                    <Link href="/dashboard/school-settings/notification-settings" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/school-settings/notification-settings" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>3. Notification Rules</Link>
                                                    <Link href="/dashboard/school-settings/integrations" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/school-settings/integrations" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>4. System Integrations</Link>
                                                    <Link href="/dashboard/school-settings/audit-activity" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/school-settings/audit-activity" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>5. Audit Activity Log</Link>
                                                    <Link href="/dashboard/school-settings/data-management" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/school-settings/data-management" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>6. Data Management</Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Operations Group */}
                                        <div className="pt-1">
                                            <button 
                                                onClick={() => toggleMenu("operations")}
                                                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#081e48] hover:text-white transition-all group cursor-pointer"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Settings className="w-4 h-4 text-amber-400" />
                                                    <span>Operations</span>
                                                </div>
                                                {openMenus.operations ? 
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> : 
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                                                }
                                            </button>
                                            {openMenus.operations && (
                                                <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#020e24]/60 rounded-xl my-1 border-l border-slate-700/50">
                                                    <Link href="/dashboard/operations/resources" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/operations/resources" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Resources</Link>
                                                    <Link href="/dashboard/operations/issues" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/operations/issues" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Issues</Link>
                                                    <Link href="/dashboard/operations/improvements" className={`block py-1.5 px-2 rounded-lg text-xs transition-colors ${pathname === "/dashboard/operations/improvements" ? "text-[#f59e0b] font-bold bg-[#0c2454]" : "text-slate-400 hover:text-amber-300 hover:bg-[#0c2454]/40"}`}>Improvements</Link>
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
                                                    <Link href="/dashboard/vice-principal/organization" className={`block py-1.5 text-sm ${pathname === "/dashboard/vice-principal/organization" ? "text-[#4085b3] font-medium" : "text-gray-500 hover:text-[#4085b3]"}`}>Organization</Link>
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
                                                    <Link href="/dashboard/vice-principal/teachers" className={`block py-1.5 text-sm ${pathname === "/dashboard/vice-principal/teachers" ? "text-[#4085b3] font-medium" : "text-gray-500 hover:text-[#4085b3]"}`}>Teaching Monitoring</Link>
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
                                                    <Link href="/dashboard/vice-principal/attendance" className={`block py-1.5 text-sm ${pathname === "/dashboard/vice-principal/attendance" ? "text-[#4085b3] font-medium" : "text-gray-500 hover:text-[#4085b3]"}`}>Student Attendance</Link>
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
                                                    <Link href="/dashboard/vice-principal/assessments" className={`block py-1.5 text-sm ${pathname === "/dashboard/vice-principal/assessments" ? "text-[#4085b3] font-medium" : "text-gray-500 hover:text-[#4085b3]"}`}>Assessments Overview</Link>
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
                                                    <Link href="/dashboard/vice-principal/support/students" className={`block py-1.5 text-sm ${pathname === "/dashboard/vice-principal/support/students" ? "text-[#4085b3] font-medium" : "text-gray-500 hover:text-[#4085b3]"}`}>Student Support</Link>
                                                    <Link href="/dashboard/vice-principal/support/teachers" className={`block py-1.5 text-sm ${pathname === "/dashboard/vice-principal/support/teachers" ? "text-[#4085b3] font-medium" : "text-gray-500 hover:text-[#4085b3]"}`}>Teacher Support</Link>
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
                    
                    {/* Page Content Padding */}
                    <div className={isTeacherRoute ? "p-4 md:p-6" : "p-6 md:p-8"}>
                        {isTeacherRoute && (
                            <TeacherBreadcrumbs pathname={pathname} currentTab={currentTab} currentType={currentType} />
                        )}
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] text-gray-700">
                <Loader2 className="h-8 w-8 animate-spin text-[#4085b3] mr-3" />
                <span className="text-lg font-medium">Loading EduBridge workspace...</span>
            </div>
        }>
            <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </Suspense>
    );
}

