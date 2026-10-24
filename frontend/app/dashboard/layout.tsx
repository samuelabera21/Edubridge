"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Loader2, BookOpen, LogOut, LayoutDashboard, Building, Search, Lock, ChevronDown, ChevronRight, Calendar, Users, GraduationCap, ClipboardCheck, FileText, Settings, User, Megaphone, Bell, MessageSquare, Package, AlertOctagon, TrendingUp, HeartHandshake, BarChart2, Sparkles, Menu, Brain, Landmark, Layers, UserCheck, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "../../lib/api";
import { getPrimaryAccess, getAccessForScope, isHierarchyAdminAccess } from "../../lib/auth-access";
import StudentNavigation from "./student/StudentNavigation";
import ParentNavigation from "./parent/ParentNavigation";
import AdministrativeNavigation from "../../components/governance/AdministrativeNavigation";
import SchoolAdminNavigation from "../../components/governance/SchoolAdminNavigation";
import TeacherNavigation from "../../components/governance/TeacherNavigation";


function TeacherBreadcrumbs({ pathname, currentTab, currentType, currentChannel }: { pathname: string; currentTab: string; currentType: string; currentChannel?: string }) {
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
    } else if (pathname.startsWith("/dashboard/teacher/communication")) {
        parentTitle = "Communication";
        parentHref = "/dashboard/teacher/communication";
        const target = (currentChannel || currentTab || "").toUpperCase();
        const tabMap: Record<string, string> = {
            STUDENT: "Student Communication",
            PARENT: "Parent Communication",
            DEPARTMENT: "Department Communication",
            STAFF: "School Communication"
        };
        if (target && tabMap[target]) {
            subItemTitle = tabMap[target];
        }
    } else if (pathname.startsWith("/dashboard/teacher/announcements")) {
        parentTitle = "Announcements";
        parentHref = "/dashboard/teacher/announcements";
        const tabMap: Record<string, string> = {
            school: "School Announcements",
            department: "Department Announcements"
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
    const currentChannel = searchParams?.get("channel") || "";

    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        dashboard: pathname === "/dashboard",
        academics: pathname.startsWith("/dashboard/academics"),
        students: pathname.startsWith("/dashboard/students"),
        teachers: pathname.startsWith("/dashboard/teachers"),
        attendance: pathname.startsWith("/dashboard/attendance"),
        teacherAssignments: pathname.startsWith("/dashboard/teacher/my-classes"),
        teacherAttendance: pathname.startsWith("/dashboard/teacher/attendance"),
        teacherCurriculum: pathname.startsWith("/dashboard/teacher/curriculum"),
        teacherSupport: pathname.startsWith("/dashboard/teacher/support"),
        teacherComm: pathname.startsWith("/dashboard/teacher/communication"),
        teacherAnnounce: pathname.startsWith("/dashboard/teacher/announcements"),
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
    const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
    const [notificationsList, setNotificationsList] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [headerCounts, setHeaderCounts] = useState<{ notifications: number; messages: number }>({
        notifications: 0,
        messages: 0,
    });

    // Route-aware access resolution: match user access to active tier if available, fallback to primary access
    const routeScopeType = pathname.startsWith("/dashboard/federal")
        ? "FEDERAL"
        : pathname.startsWith("/dashboard/region")
        ? "REGION"
        : pathname.startsWith("/dashboard/zone")
        ? "ZONE"
        : pathname.startsWith("/dashboard/woreda")
        ? "WOREDA"
        : null;

    const primaryAccess = getPrimaryAccess(authData?.access);
    const activeAccess = getAccessForScope(authData?.access, routeScopeType) || primaryAccess;
    const roleName = activeAccess?.role?.name || primaryAccess?.role?.name || "Unassigned";
    const scopeType = activeAccess?.scope?.type || primaryAccess?.scope?.type || "";
    const isAdminRole = ["ADMIN", "SCHOOL_ADMIN", "ADMINISTRATOR", "PRINCIPAL", "FEDERAL_ADMIN", "REGION_ADMIN", "ZONE_ADMIN", "ZONAL_ADMIN", "WOREDA_ADMIN"].includes(roleName);
    const isSchoolAdmin = scopeType === "SCHOOL" && isAdminRole;
    const isFederalScope = scopeType === "FEDERAL";
    const isAdministrativeRoute = pathname.startsWith("/dashboard/federal") || pathname.startsWith("/dashboard/region") || pathname.startsWith("/dashboard/zone") || pathname.startsWith("/dashboard/woreda");
    const isTeacherRoute = (pathname === "/dashboard/teacher" || pathname.startsWith("/dashboard/teacher/")) && roleName === "TEACHER";
    const isStudentRoute = (pathname === "/dashboard/student" || pathname.startsWith("/dashboard/student/")) || roleName === "STUDENT";
    const isParentRoute = (pathname === "/dashboard/parent" || pathname.startsWith("/dashboard/parent/")) || roleName === "PARENT";

    // Dynamic administrative tier info
    const adminTierInfo = (() => {
        if (pathname.startsWith("/dashboard/region") || scopeType === "REGION" || roleName === "REGION_ADMIN") {
            return {
                tierRole: "Region Admin",
                desk: "Regional Education Bureau",
                masthead: "Regional Education Bureau"
            };
        }
        if (pathname.startsWith("/dashboard/zone") || scopeType === "ZONE" || roleName === "ZONE_ADMIN" || roleName === "ZONAL_ADMIN") {
            return {
                tierRole: "Zone Admin",
                desk: "Zonal Education Department",
                masthead: "Zonal Education Department"
            };
        }
        if (pathname.startsWith("/dashboard/woreda") || scopeType === "WOREDA" || roleName === "WOREDA_ADMIN") {
            return {
                tierRole: "Woreda Admin",
                desk: "Woreda Education Office",
                masthead: "Woreda Education Office"
            };
        }
        if (pathname.startsWith("/dashboard/federal") || scopeType === "FEDERAL" || roleName === "FEDERAL_ADMIN") {
            return {
                tierRole: "Federal Admin",
                desk: "MoE Federal Desk",
                masthead: "Federal Ministry of Education"
            };
        }
        return null;
    })();

    const displayRole = isTeacherRoute
        ? "Teacher"
        : isStudentRoute
        ? "Student"
        : isParentRoute
        ? "Parent"
        : adminTierInfo
        ? adminTierInfo.tierRole
        : (roleName !== "Unassigned" ? roleName.replace(/_/g, " ") : "User");

    const displayDesk = adminTierInfo?.desk;
    const displayName = authData?.user?.name || (adminTierInfo ? adminTierInfo.tierRole : "User");
    const displayEmail = authData?.user?.email || "";


    const getActiveDeskOrgId = () => {
        if (!authData?.access?.length) return undefined;
        if (pathname.startsWith("/dashboard/federal")) {
            return authData.access.find((a: any) => a.scope?.type === "FEDERAL")?.scope?.id;
        }
        if (pathname.startsWith("/dashboard/region")) {
            return authData.access.find((a: any) => a.scope?.type === "REGION")?.scope?.id;
        }
        if (pathname.startsWith("/dashboard/zone")) {
            return authData.access.find((a: any) => a.scope?.type === "ZONE")?.scope?.id;
        }
        if (pathname.startsWith("/dashboard/woreda")) {
            return authData.access.find((a: any) => a.scope?.type === "WOREDA")?.scope?.id;
        }
        const schoolScope = authData.access.find((a: any) => a.scope?.type === "SCHOOL")?.scope?.id;
        return schoolScope || primaryAccess?.scope?.id;
    };

    const loadNotifications = async () => {
        try {
            const activeOrgId = getActiveDeskOrgId();
            const query = activeOrgId ? `?organizationId=${activeOrgId}` : "";
            const res = await fetchApi(`/communication/notifications${query}`, {
                headers: activeOrgId ? { "x-organization-id": activeOrgId } : {}
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setNotificationsList(data);
                    setUnreadCount(data.filter((n: any) => !n.isRead).length);
                }
            }
        } catch {
            // Ignore
        }
    };

    const markNotificationAsRead = async (id: string, link?: string | null) => {
        try {
            const activeOrgId = getActiveDeskOrgId();
            const query = activeOrgId ? `?organizationId=${activeOrgId}` : "";
            await fetchApi(`/communication/notifications/${id}/read${query}`, {
                method: "PATCH",
                headers: activeOrgId ? { "x-organization-id": activeOrgId } : {}
            });
            setNotificationsList(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch {}
        if (link) {
            setShowNotificationsDropdown(false);
            router.push(link);
        }
    };

    useEffect(() => {
        if (!authData) return;
        loadNotifications();

        // 1. Periodic poll every 10 seconds for real-time notification delivery without requiring manual page refresh
        const intervalId = setInterval(() => {
            loadNotifications();
        }, 10000);

        // 2. Refresh on window focus and custom notification-updated event
        const handleRefresh = () => {
            loadNotifications();
        };
        window.addEventListener("focus", handleRefresh);
        window.addEventListener("notification-updated", handleRefresh);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener("focus", handleRefresh);
            window.removeEventListener("notification-updated", handleRefresh);
        };
    }, [authData, pathname]);

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

    useEffect(() => {
        const originalHtmlOverflow = document.documentElement.style.overflow;
        const originalBodyOverflow = document.body.style.overflow;
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        return () => {
            document.documentElement.style.overflow = originalHtmlOverflow;
            document.body.style.overflow = originalBodyOverflow;
        };
    }, []);

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
        // 0. The root /dashboard and /dashboard/admin are the School Administrator / Principal Dashboard
        if (pathname === "/dashboard" || pathname === "/dashboard/admin") {
            return isSchoolAdmin;
        }

        // 1. /dashboard/teachers (plural) is the Admin Teacher Management route
        if (pathname.startsWith("/dashboard/teachers")) {
            return isSchoolAdmin;
        }

        // 2. /dashboard/teacher (singular) is strictly reserved for the TEACHER actor workspace
        if (pathname === "/dashboard/teacher" || pathname.startsWith("/dashboard/teacher/")) {
            return roleName === "TEACHER";
        }

        // 3. Admin routes (/dashboard/admin, /dashboard/academics, /dashboard/school) are strictly for SCHOOL-scoped ADMIN roles
        if (
            pathname.startsWith("/dashboard/admin") ||
            pathname.startsWith("/dashboard/academics") ||
            pathname.startsWith("/dashboard/school")
        ) {
            return isSchoolAdmin;
        }

        // 4. Student routes
        if (pathname.startsWith("/dashboard/student")) {
            return roleName === "STUDENT" || isAdminRole;
        }

        // 5. Parent routes
        if (pathname.startsWith("/dashboard/parent")) {
            return roleName === "PARENT" || isAdminRole;
        }

        // 6. Vice Principal routes
        if (pathname.startsWith("/dashboard/vice-principal")) {
            return roleName === "VICE_PRINCIPAL" || isAdminRole;
        }

        return true;
    })();

    if (!isRouteAuthorized) {
        const getAuthorizedRolePath = (role: string, currentScope: string) => {
            switch (currentScope) {
                case "FEDERAL": return "/dashboard/federal";
                case "REGION": return "/dashboard/region";
                case "ZONE": return "/dashboard/zone";
                case "WOREDA": return "/dashboard/woreda";
            }

            switch (role) {
                case "ADMIN":
                case "SCHOOL_ADMIN":
                case "ADMINISTRATOR":
                case "PRINCIPAL": return "/dashboard/admin";
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
                        onClick={() => router.push(getAuthorizedRolePath(roleName, scopeType))}
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
        <div className="fixed inset-0 flex flex-col bg-[#f4f5f7] font-sans overflow-hidden">
            {/* Top Masthead Strip */}
            <div className="bg-[#0b1c2d] text-slate-300 text-[11px] px-6 py-1.5 flex items-center justify-between border-b border-[#162f49] select-none shrink-0">
                <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white tracking-wider uppercase text-[10px]">
                        Federal Democratic Republic of Ethiopia
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">
                        {adminTierInfo?.masthead || "Ministry of Education"}
                    </span>
                </div>
                <div className="hidden sm:flex items-center space-x-3 text-[10px] text-slate-400">
                    <span className="font-medium text-slate-300">
                        {activeAccess?.scope?.name ? activeAccess.scope.name : "National EMIS Portal"}
                    </span>
                    <span className="text-slate-600">|</span>
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Official System
                    </span>
                </div>
            </div>

            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-6 z-10 shrink-0">
                <div className="flex items-center space-x-3">
                    <Link href="/dashboard" className="flex items-center space-x-3 group">
                        <div className="w-8 h-8 rounded-md bg-[#4085b3] flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-105">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                                <span className="text-base font-bold text-slate-900 tracking-tight leading-none">
                                    Edu<span className="text-[#4085b3]">Bridge</span>
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                                    EMIS
                                </span>
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 tracking-normal mt-0.5">
                                National Education Management Information System
                            </span>
                        </div>
                    </Link>
                </div>

                <div className="flex items-center space-x-4">
                    {/* Teacher-specific search */}
                    {isTeacherRoute && (
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Search (students, classes, assignments...)" 
                                className="bg-slate-50 border border-slate-200 text-xs rounded-md pl-8 pr-3 py-1.5 focus:bg-white focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3] outline-none w-64 text-slate-800 placeholder-slate-400 transition-colors"
                            />
                            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        </div>
                    )}

                    {/* In-App Notifications Bell for All Roles */}
                    <div className="relative">
                        <button 
                            onClick={() => {
                                setShowNotificationsDropdown(!showNotificationsDropdown);
                                setShowProfileDropdown(false);
                            }}
                            className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer" 
                            title="In-App Notifications & Directives"
                        >
                            <Bell className="w-5 h-5 text-gray-600" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 px-1 min-w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notifications Dropdown */}
                        {showNotificationsDropdown && (
                            <div 
                                className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-50 text-xs text-gray-700 animate-in fade-in slide-in-from-top-2 duration-150"
                                onMouseLeave={() => setShowNotificationsDropdown(false)}
                            >
                                <div className="flex items-center justify-between px-4 pb-2.5 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900 text-xs">Notifications</span>
                                        {unreadCount > 0 && (
                                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 font-bold rounded text-[10px]">
                                                {unreadCount} unread
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await Promise.all(
                                                    notificationsList.filter(n => !n.isRead).map(n =>
                                                        fetchApi(`/communication/notifications/${n.id}/read`, { method: "PATCH" })
                                                    )
                                                );
                                                setNotificationsList(prev => prev.map(n => ({ ...n, isRead: true })));
                                                setUnreadCount(0);
                                            } catch {}
                                        }}
                                        className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                                    >
                                        Mark all read
                                    </button>
                                </div>

                                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                                    {notificationsList.length === 0 ? (
                                        <div className="py-8 text-center text-gray-400 text-xs">
                                            No notifications right now.
                                        </div>
                                    ) : (
                                        notificationsList.slice(0, 8).map(n => {
                                            const extractDirectiveId = (link?: string | null) => {
                                                if (!link) return null;
                                                try {
                                                    const dummyUrl = new URL(link, "http://localhost");
                                                    return dummyUrl.searchParams.get("directiveId") || dummyUrl.searchParams.get("id");
                                                } catch {
                                                    return null;
                                                }
                                            };

                                            const extractedId = extractDirectiveId(n.link);

                                            const getDirectivesOrAnnouncementsUrl = (targetId?: string | null) => {
                                                const idParam = targetId ? `&directiveId=${targetId}` : "";
                                                if (pathname.startsWith("/dashboard/student") || roleName === "STUDENT") {
                                                    return `/dashboard/student/communication${targetId ? `?id=${targetId}` : ""}`;
                                                }
                                                if (pathname.startsWith("/dashboard/teacher") || roleName === "TEACHER" || isTeacherRoute) {
                                                    return `/dashboard/teacher/communication/staff${targetId ? `?id=${targetId}` : ""}`;
                                                }
                                                if (pathname.startsWith("/dashboard/region") || scopeType === "REGION" || roleName === "REGION_ADMIN") {
                                                    return `/dashboard/region?tab=directives&subTab=INCOMING${idParam}`;
                                                }
                                                if (pathname.startsWith("/dashboard/zone") || scopeType === "ZONE" || roleName === "ZONE_ADMIN") {
                                                    return `/dashboard/zone?tab=directives&subTab=INCOMING${idParam}`;
                                                }
                                                if (pathname.startsWith("/dashboard/woreda") || scopeType === "WOREDA" || roleName === "WOREDA_ADMIN") {
                                                    return `/dashboard/woreda?tab=directives&subTab=INCOMING${idParam}`;
                                                }
                                                if (pathname.startsWith("/dashboard/federal") || scopeType === "FEDERAL" || roleName === "FEDERAL_ADMIN") {
                                                    return `/dashboard/federal?tab=directives${idParam}`;
                                                }
                                                return `/dashboard/communication/announcements?tab=directives${idParam}`;
                                            };

                                            const isProgramRelated = (n.title || "").toLowerCase().includes("initiative") || 
                                                (n.title || "").toLowerCase().includes("program") || 
                                                (n.link || "").includes("/programs") || 
                                                (n.link || "").includes("tab=programs");

                                            const extractProgramId = (link?: string | null) => {
                                                if (!link) return null;
                                                try {
                                                    const dummyUrl = new URL(link, "http://localhost");
                                                    return dummyUrl.searchParams.get("programId") || dummyUrl.searchParams.get("id");
                                                } catch {
                                                    return null;
                                                }
                                            };

                                            const extractProgramTitle = (title?: string | null) => {
                                                if (!title) return null;
                                                const match = title.match(/(?:Initiative|Program(?:\s+Status\s+Update(?:\s*\([^)]*\))?)?|Program\s+Acknowledged)\s*[:\-–]\s*(.+)$/i);
                                                if (match) return match[1].trim();
                                                const colonIdx = title.indexOf(":");
                                                if (colonIdx !== -1 && colonIdx < title.length - 1) {
                                                    return title.substring(colonIdx + 1).trim();
                                                }
                                                return title.trim();
                                            };

                                            const progId = extractProgramId(n.link);
                                            const progTitle = extractProgramTitle(n.title);

                                            const getProgramUrl = () => {
                                                const params = new URLSearchParams();
                                                if (progId) params.set("programId", progId);
                                                if (progTitle) params.set("programTitle", progTitle);
                                                const paramStr = params.toString() ? `&${params.toString()}` : "";
                                                const questionParamStr = params.toString() ? `?${params.toString()}` : "";

                                                if (pathname.startsWith("/dashboard/region") || scopeType === "REGION" || roleName === "REGION_ADMIN") {
                                                    return `/dashboard/region?tab=programs${paramStr}`;
                                                }
                                                if (pathname.startsWith("/dashboard/zone") || scopeType === "ZONE" || roleName === "ZONE_ADMIN") {
                                                    return `/dashboard/zone?tab=programs${paramStr}`;
                                                }
                                                if (pathname.startsWith("/dashboard/woreda") || scopeType === "WOREDA" || roleName === "WOREDA_ADMIN") {
                                                    return `/dashboard/woreda?tab=programs${paramStr}`;
                                                }
                                                if (pathname.startsWith("/dashboard/federal") || scopeType === "FEDERAL" || roleName === "FEDERAL_ADMIN") {
                                                    return `/dashboard/federal?tab=programs${paramStr}`;
                                                }
                                                return `/dashboard/programs${questionParamStr}`;
                                            };

                                            const isDirectiveRelated = !isProgramRelated && ((n.title || "").toLowerCase().includes("directive") || (n.title || "").toLowerCase().includes("policy") || (n.title || "").toLowerCase().includes("announcement"));

                                            const isDirectivesRoute = !isProgramRelated && (!n.link || n.link === "/dashboard/directives" || n.link.startsWith("/dashboard/directives?") || (isDirectiveRelated && (n.link === "/dashboard/communication/announcements" || n.link.startsWith("/dashboard/communication/announcements?id="))));

                                            let resolvedLink = n.link;
                                            if (isProgramRelated) {
                                                resolvedLink = getProgramUrl();
                                            } else if (isDirectivesRoute) {
                                                resolvedLink = getDirectivesOrAnnouncementsUrl(extractedId);
                                            }

                                            return (
                                                <div
                                                    key={n.id}
                                                    onClick={() => {
                                                        markNotificationAsRead(n.id, resolvedLink);
                                                        if (isProgramRelated && typeof window !== "undefined") {
                                                            window.dispatchEvent(new CustomEvent("open-program-detail", {
                                                                detail: { programId: progId, programTitle: progTitle }
                                                            }));
                                                            setTimeout(() => {
                                                                window.dispatchEvent(new CustomEvent("open-program-detail", {
                                                                    detail: { programId: progId, programTitle: progTitle }
                                                                }));
                                                            }, 120);
                                                        }
                                                    }}
                                                    className={`p-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                                                        !n.isRead ? "bg-blue-50/40" : ""
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="font-semibold text-gray-900 text-xs">
                                                            {n.title}
                                                        </div>
                                                        {!n.isRead && (
                                                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                                                        {n.content}
                                                    </p>
                                                    <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
                                                        <span>{n.organization?.name || "Official Mandate"}</span>
                                                        <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                 <div className="pt-2 px-4 border-t border-gray-100 text-center">
                                     {(() => {
                                         const viewAllUrl = (() => {
                                             if (pathname.startsWith("/dashboard/student") || roleName === "STUDENT") {
                                                 return "/dashboard/student/communication";
                                             }
                                             if (pathname.startsWith("/dashboard/teacher") || roleName === "TEACHER" || isTeacherRoute) {
                                                 return "/dashboard/teacher/communication/staff";
                                             }
                                             if (pathname.startsWith("/dashboard/region") || scopeType === "REGION" || roleName === "REGION_ADMIN") {
                                                 return "/dashboard/region?tab=directives";
                                             }
                                             if (pathname.startsWith("/dashboard/zone") || scopeType === "ZONE" || roleName === "ZONE_ADMIN") {
                                                 return "/dashboard/zone?tab=directives";
                                             }
                                             if (pathname.startsWith("/dashboard/woreda") || scopeType === "WOREDA" || roleName === "WOREDA_ADMIN") {
                                                 return "/dashboard/woreda?tab=directives";
                                             }
                                             if (pathname.startsWith("/dashboard/federal") || scopeType === "FEDERAL" || roleName === "FEDERAL_ADMIN") {
                                                 return "/dashboard/federal?tab=directives";
                                             }
                                             return "/dashboard/communication/announcements";
                                         })();
                                         return (
                                             <Link
                                                 href={viewAllUrl}
                                                 onClick={() => setShowNotificationsDropdown(false)}
                                                 className="text-xs font-bold text-blue-600 hover:text-blue-800"
                                             >
                                                 View All Directives & Announcements →
                                             </Link>
                                         );
                                     })()}
                                 </div>
                            </div>
                        )}
                    </div>

                    {/* Teacher specific message badge */}
                    {isTeacherRoute && (
                        <div className="flex items-center space-x-3">
                            <button 
                                onClick={() => router.push("/dashboard/teacher/communication?tab=messages")}
                                className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer" 
                                title="Messages & Channels"
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
                            className="flex items-center space-x-2.5 hover:opacity-90 transition-opacity focus:outline-none cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-md bg-[#4085b3] border border-slate-200 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                                {authData?.user?.name ? authData.user.name.split(' ').map((n: string) => n[0]).join('') : (adminTierInfo ? adminTierInfo.tierRole[0] : "U")}
                            </div>
                            <div className="hidden sm:block text-left">
                                <p className="text-xs font-bold text-slate-800 leading-tight">{displayName}</p>
                                <p className="text-[10px] text-slate-500 font-medium leading-tight">
                                    {displayRole}
                                </p>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showProfileDropdown ? "rotate-180" : ""}`} />
                        </button>

                        {/* Dropdown Menu Popup */}
                        {showProfileDropdown && (
                            <div 
                                className="absolute right-0 mt-3 w-60 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 text-xs font-medium text-slate-700 animate-in fade-in slide-in-from-top-2 duration-150"
                                onMouseLeave={() => setShowProfileDropdown(false)}
                            >
                                {/* Header info */}
                                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70">
                                    <p className="font-bold text-slate-900 text-xs">{displayName}</p>
                                    {displayEmail ? (
                                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{displayEmail}</p>
                                    ) : null}
                                    <div className="mt-1.5 flex items-center gap-1.5">
                                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-semibold text-[9px] uppercase tracking-wider">
                                            {displayRole}
                                        </span>
                                        {displayDesk && (
                                            <span className="text-[10px] text-slate-400">
                                                {displayDesk}
                                            </span>
                                        )}
                                    </div>
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

            <div className="flex flex-1 overflow-hidden min-h-0">
                {/* Sidebar */}
                {isAdministrativeRoute || isFederalScope || isHierarchyAdminAccess(primaryAccess) ? (
                    <AdministrativeNavigation
                        sidebarCollapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                    />
                ) : isTeacherRoute ? (
                    <TeacherNavigation
                        sidebarCollapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                    />
                ) : isStudentRoute ? (
                    <StudentNavigation collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
                ) : isParentRoute ? (
                    <ParentNavigation collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
                ) : (
                    <SchoolAdminNavigation
                        sidebarCollapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                    />
                )}

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col overflow-y-auto min-h-0 bg-[#f4f5f7]">
                    
                    {/* Page Content Padding */}
                    <div className={isTeacherRoute ? "p-4 md:p-6" : "p-6 md:p-8"}>
                        {isTeacherRoute && (
                            <TeacherBreadcrumbs pathname={pathname} currentTab={currentTab} currentType={currentType} currentChannel={currentChannel} />
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

