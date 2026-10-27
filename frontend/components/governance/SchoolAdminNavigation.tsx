"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    Building2,
    Calendar,
    Users,
    GraduationCap,
    ClipboardCheck,
    FileText,
    BookOpen,
    HeartHandshake,
    Megaphone,
    TrendingUp,
    BarChart3,
    Brain,
    Lock,
    Settings,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    FileSpreadsheet,
    FolderKanban,
    MessageSquare,
    Sparkles,
    type LucideIcon
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getPrimaryAccess } from "../../lib/auth-access";

interface NavSubLink {
    label: string;
    href: string;
    hidden?: boolean; // set true to hide without deleting
}

interface NavItem {
    label: string;
    icon: LucideIcon;
    href?: string;
    basePath?: string;
    subLinks?: NavSubLink[];
    hidden?: boolean; // set true to hide without deleting
}

interface NavGroup {
    title: string;
    items: NavItem[];
    hidden?: boolean; // set true to hide without deleting
}

export default function SchoolAdminNavigation({
    sidebarCollapsed = false,
    onToggleCollapse,
}: {
    sidebarCollapsed?: boolean;
    onToggleCollapse?: () => void;
}) {
    const pathname = usePathname();
    const { authData } = useAuth(false);
    const primaryAccess = getPrimaryAccess(authData?.access);
    const roleName = primaryAccess?.role?.name || "";
    const isVicePrincipal = roleName === "VICE_PRINCIPAL";

    // Dynamic School info
    const schoolName = primaryAccess?.scope?.name || "School Administration";
    const headerTitle = isVicePrincipal ? "Vice Principal Office" : schoolName;
    const headerSubtitle = isVicePrincipal
        ? "Academic & Faculty Administration"
        : "School Administration • Woreda Jurisdiction";

    // Accordion state for expandable sections
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

    // Auto-expand menus based on current pathname
    useEffect(() => {
        setOpenMenus((prev) => {
            const next = { ...prev };
            if (pathname.startsWith("/dashboard/academics")) next["academics"] = true;
            if (pathname.startsWith("/dashboard/students")) next["students"] = true;
            if (pathname.startsWith("/dashboard/teachers")) next["teachers"] = true;
            if (pathname.startsWith("/dashboard/attendance")) next["attendance"] = true;
            if (pathname.startsWith("/dashboard/assessment") || pathname.startsWith("/dashboard/results")) next["results"] = true;
            if (pathname.startsWith("/dashboard/support")) next["support"] = true;
            if (pathname.startsWith("/dashboard/communication") || pathname.startsWith("/dashboard/directives") || pathname.startsWith("/dashboard/data-requests")) next["communication"] = true;
            if (pathname.startsWith("/dashboard/improvement")) next["improvement"] = true;
            if (pathname.startsWith("/dashboard/reports")) next["reports"] = true;
            if (pathname.startsWith("/dashboard/ai-leadership")) next["aiLeadership"] = true;
            if (pathname.startsWith("/dashboard/users-permissions")) next["usersPermissions"] = true;
            if (pathname.startsWith("/dashboard/operations")) next["operations"] = true;
            if (pathname.startsWith("/dashboard/vice-principal/support")) next["vpSupport"] = true;
            return next;
        });
    }, [pathname]);

    const toggleMenu = (key: string) => {
        setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // Vice Principal Specific Navigation Groups
    const vicePrincipalGroups: NavGroup[] = [
        {
            title: "Monitoring",
            items: [
                {
                    label: "Dashboard Overview",
                    href: "/dashboard/vice-principal",
                    icon: LayoutDashboard,
                },
            ],
        },
        {
            title: "Academics & Faculty",
            items: [
                {
                    label: "Academic Organization",
                    href: "/dashboard/vice-principal/organization",
                    icon: Calendar,
                },
                {
                    label: "Teaching Monitoring",
                    href: "/dashboard/vice-principal/teachers",
                    icon: Users,
                },
                {
                    label: "Student Attendance",
                    href: "/dashboard/vice-principal/attendance",
                    icon: ClipboardCheck,
                },
                {
                    label: "Results Overview",
                    href: "/dashboard/results",
                    icon: FileSpreadsheet,
                },
            ],
        },
        {
            title: "Support Systems",
            items: [
                {
                    label: "Support Systems",
                    icon: HeartHandshake,
                    basePath: "/dashboard/vice-principal/support",
                    subLinks: [
                        { label: "Student Support", href: "/dashboard/vice-principal/support/students" },
                        { label: "Teacher Support", href: "/dashboard/vice-principal/support/teachers" },
                    ],
                },
            ],
        },
        {
            title: "Intelligence & Comms",
            items: [
                {
                    label: "Academic Reports",
                    href: "/dashboard/vice-principal/reports",
                    icon: BarChart3,
                },
                {
                    label: "Communication",
                    href: "/dashboard/vice-principal/communication",
                    icon: MessageSquare,
                },
                {
                    label: "AI Assistant",
                    href: "/dashboard/vice-principal/ai-insights",
                    icon: Sparkles,
                },
            ],
        },
    ];

    // Standard School Admin Navigation Groups
    const schoolAdminGroups: NavGroup[] = [
        {
            title: "Monitoring",
            items: [
                {
                    label: "Dashboard Overview",
                    href: "/dashboard/admin",
                    icon: LayoutDashboard,
                },
                {
                    label: "School Profile",
                    href: "/dashboard/school/profile",
                    icon: Building2,
                },
            ],
        },
        {
            title: "Academic Management",
            items: [
                {
                    label: "Curriculum & Timetable",
                    icon: Calendar,
                    basePath: "/dashboard/academics",
                    subLinks: [
                        { label: "Academic Years", href: "/dashboard/academics/years" },
                        { label: "Grades & Sections", href: "/dashboard/academics/grades" },
                        { label: "Subjects & Syllabus", href: "/dashboard/academics/subjects" },
                        { label: "Academic Calendar", href: "/dashboard/academics/calendar" },
                        { label: "Instructional Timetable", href: "/dashboard/academics/timetable" },
                    ],
                },
                {
                    label: "Students & Enrollment",
                    icon: Users,
                    basePath: "/dashboard/students",
                    subLinks: [
                        { label: "All Students Directory", href: "/dashboard/students" },
                        { label: "Student Enrollments", href: "/dashboard/students/enrollments" },
                        { label: "Classroom Placement", href: "/dashboard/students/placement" },
                    ],
                },
                {
                    label: "Faculty & Teachers",
                    icon: GraduationCap,
                    basePath: "/dashboard/teachers",
                    subLinks: [
                        { label: "Teaching Faculty", href: "/dashboard/teachers" },
                        { label: "Teaching Assignments", href: "/dashboard/teachers/assignments" },
                    ],
                },
                {
                    label: "Attendance Tracking",
                    href: "/dashboard/attendance",
                    icon: ClipboardCheck,
                },
            ],
        },
        {
            title: "Student Success & Support",
            items: [
                {
                    label: "Results",
                    href: "/dashboard/results",
                    icon: FileSpreadsheet,
                },
                {
                    // hidden: Phase 2 — not core to data-bridge mission
                    label: "Student Support & Advisory",
                    icon: BookOpen,
                    hidden: true,
                    basePath: "/dashboard/support",
                    subLinks: [
                        { label: "At-Risk Flags", href: "/dashboard/support/at-risk" },
                        { label: "Learning Difficulties", href: "/dashboard/support/learning-difficulties" },
                        { label: "Remedial Programs", href: "/dashboard/support/remedial" },
                        { label: "Enrichment Programs", href: "/dashboard/support/enrichment" },
                        { label: "Intervention Plans", href: "/dashboard/support/intervention-plans" },
                        { label: "Intervention Monitoring", href: "/dashboard/support/monitoring" },
                        { label: "Intervention Outcomes", href: "/dashboard/support/outcomes" },
                    ],
                },
                {
                    label: "Parents & Guardians",
                    href: "/dashboard/parents",
                    icon: HeartHandshake,
                },
            ],
        },
        {
            title: "Directives & Communications",
            items: [
                {
                    label: "Communications",
                    icon: Megaphone,
                    basePath: "/dashboard/communication",
                    subLinks: [
                        { label: "Policies & Directives", href: "/dashboard/directives" },
                        { label: "Data Requests & Surveys", href: "/dashboard/data-requests" },
                        { label: "Announcements", href: "/dashboard/communication/announcements" },
                        { label: "Important Notices", href: "/dashboard/communication/notices", hidden: true },
                        { label: "Direct Messages", href: "/dashboard/communication/messages" },
                        { label: "Messaging Settings", href: "/dashboard/communication/settings" },
                        { label: "Staff Circulars", href: "/dashboard/communication/staff", hidden: true },
                    ],
                },
                {
                    // hidden: internal planning tool, not actor-facing
                    label: "School Improvement (SIP)",
                    icon: TrendingUp,
                    hidden: true,
                    basePath: "/dashboard/improvement",
                    subLinks: [
                        { label: "Identify Problems", href: "/dashboard/improvement/problems" },
                        { label: "Improvement Priorities", href: "/dashboard/improvement/priorities" },
                        { label: "Improvement Plans", href: "/dashboard/improvement/plans" },
                        { label: "Improvement Activities", href: "/dashboard/improvement/activities" },
                        { label: "KPI Targets", href: "/dashboard/improvement/targets" },
                        { label: "Progress Monitoring", href: "/dashboard/improvement/monitoring" },
                        { label: "Outcomes & Impact", href: "/dashboard/improvement/outcomes" },
                    ],
                },
            ],
        },
        {
            title: "System",
            items: [
                {
                    // hidden: data flows via Data Requests; no separate reports module needed at school level
                    label: "Reports & Analytics",
                    icon: BarChart3,
                    hidden: true,
                    basePath: "/dashboard/reports",
                    subLinks: [
                        { label: "Enrollment Reports", href: "/dashboard/reports/enrollment" },
                        { label: "Attendance Reports", href: "/dashboard/reports/attendance" },
                        { label: "Teacher Reports", href: "/dashboard/reports/teacher" },
                        { label: "Assessment Reports", href: "/dashboard/reports/assessment" },
                        { label: "Student Performance", href: "/dashboard/reports/performance" },
                        { label: "Curriculum Progress", href: "/dashboard/reports/curriculum" },
                        { label: "Student Support", href: "/dashboard/reports/support" },
                        { label: "School Performance", href: "/dashboard/reports/school-performance" },
                    ],
                },
                {
                    // hidden: premature / not functional yet
                    label: "AI Leadership Insights",
                    icon: Brain,
                    hidden: true,
                    basePath: "/dashboard/ai-leadership",
                    subLinks: [
                        { label: "Performance Analysis", href: "/dashboard/ai-leadership/school-performance" },
                        { label: "Attendance Modeling", href: "/dashboard/ai-leadership/attendance" },
                        { label: "Student-Risk Insights", href: "/dashboard/ai-leadership/student-risk" },
                        { label: "Trend Detection", href: "/dashboard/ai-leadership/performance-trends" },
                        { label: "Trend Detection", href: "/dashboard/ai-leadership/performance-trends" },
                        { label: "Intervention Analysis", href: "/dashboard/ai-leadership/intervention" },
                        { label: "SIP Recommendations", href: "/dashboard/ai-leadership/improvement-recommendations" },
                        { label: "Natural-Language AI", href: "/dashboard/ai-leadership/natural-language" },
                        { label: "Executive Summaries", href: "/dashboard/ai-leadership/executive-summaries" },
                    ],
                },
                {
                    label: "Users & Access Control",
                    icon: Lock,
                    basePath: "/dashboard/users-permissions",
                    subLinks: [
                        { label: "All Accounts", href: "/dashboard/users-permissions" },
                        { label: "Administrators & Leadership", href: "/dashboard/users-permissions/administrators", hidden: true },
                        { label: "Teachers", href: "/dashboard/users-permissions/teachers" },
                        { label: "Students", href: "/dashboard/users-permissions/students" },
                        { label: "Parents & Guardians", href: "/dashboard/users-permissions/parents" },
                        { label: "Support Staff", href: "/dashboard/users-permissions/staff", hidden: true },
                        { label: "Roles & Permissions", href: "/dashboard/users-permissions/roles" },
                    ],
                },
                {
                    // hidden: internal admin, not actor-facing
                    label: "School Operations",
                    icon: FolderKanban,
                    hidden: true,
                    basePath: "/dashboard/operations",
                    subLinks: [
                        { label: "Resources Inventory", href: "/dashboard/operations/resources" },
                        { label: "Issues Log", href: "/dashboard/operations/issues" },
                        { label: "Operational Improvements", href: "/dashboard/operations/improvements" },
                    ],
                },
                {
                    label: "School Settings",
                    href: "/dashboard/school-settings",
                    icon: Settings,
                },
            ],
        },
    ];

    // Filter out hidden groups and items at render time (recoverable — just remove `hidden: true` to restore)
    const rawGroups = isVicePrincipal ? vicePrincipalGroups : schoolAdminGroups;
    const activeGroups = rawGroups
        .filter((g) => !g.hidden)
        .map((g) => ({
            ...g,
            items: g.items
                .filter((item) => !item.hidden)
                .map((item) => ({
                    ...item,
                    subLinks: item.subLinks?.filter((sl) => !sl.hidden),
                })),
        }))
        .filter((g) => g.items.length > 0);

    return (
        <aside
            className={`h-full bg-[#f8fafc] border-r border-slate-200 flex flex-col hidden md:flex overflow-y-auto scrollbar-hide text-slate-700 font-sans shrink-0 transition-all duration-200 ease-in-out ${
                sidebarCollapsed ? "w-16" : "w-64"
            }`}
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
            {/* Sidebar Header Masthead */}
            <div className={`flex items-center border-b border-slate-200 bg-white shrink-0 ${
                sidebarCollapsed ? "justify-center py-3 px-2" : "justify-between px-3.5 py-3"
            }`}>
                {!sidebarCollapsed && (
                    <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-900 truncate">
                            {headerTitle}
                        </p>
                        <span className="text-[10px] font-medium text-slate-500 block truncate">
                            {headerSubtitle}
                        </span>
                    </div>
                )}
                {onToggleCollapse && (
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        className={`flex items-center justify-center w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0 ${
                            sidebarCollapsed ? "" : "ml-auto"
                        }`}
                    >
                        {sidebarCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <ChevronLeft className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>

            {/* Grouped Navigation Links */}
            <div className="p-2.5 flex-1 space-y-4">
                {activeGroups.map((group) => (
                    <div key={group.title} className="space-y-0.5">
                        {!sidebarCollapsed && (
                            <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                                {group.title}
                            </div>
                        )}
                        <nav className="space-y-0.5">
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isSubGroup = Boolean(item.subLinks && item.subLinks.length > 0);
                                const menuKey = item.basePath?.split("/").pop() || item.label;
                                const isMenuOpen = Boolean(openMenus[menuKey]);

                                // Active calculation for direct link
                                const isDirectActive = item.href
                                    ? pathname === item.href ||
                                      (item.href === "/dashboard/admin" && (pathname === "/dashboard" || pathname === "/dashboard/admin"))
                                    : false;

                                // Active calculation for parent group
                                const isGroupActive = item.basePath
                                    ? pathname.startsWith(item.basePath) || (item.subLinks?.some(sl => pathname === sl.href || pathname.startsWith(`${sl.href}/`)) ?? false)
                                    : false;

                                if (isSubGroup && item.subLinks) {
                                    // If collapsed, direct click takes to first sublink or basePath
                                    if (sidebarCollapsed) {
                                        const firstSubHref = item.subLinks[0]?.href || item.basePath || "/dashboard/admin";
                                        return (
                                            <Link
                                                key={item.label}
                                                href={firstSubHref}
                                                title={item.label}
                                                className={`group flex items-center justify-center px-2 py-2 text-xs transition-all duration-150 cursor-pointer rounded-md ${
                                                    isGroupActive
                                                        ? "bg-[#4085b3] text-white font-semibold shadow-xs"
                                                        : "text-slate-700 hover:bg-[#4085b3] hover:text-white"
                                                }`}
                                            >
                                                <Icon
                                                    className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                                                        isGroupActive ? "text-white" : "text-slate-400 group-hover:text-white"
                                                    }`}
                                                />
                                            </Link>
                                        );
                                    }

                                    return (
                                        <div key={item.label} className="space-y-0.5">
                                            <button
                                                type="button"
                                                onClick={() => toggleMenu(menuKey)}
                                                title={item.label}
                                                className={`w-full group flex items-center justify-between px-2.5 py-2 text-xs transition-all duration-150 cursor-pointer rounded-md ${
                                                    isGroupActive && !isMenuOpen
                                                        ? "bg-[#4085b3]/10 text-[#245f8b] font-semibold"
                                                        : "text-slate-700 hover:bg-[#4085b3] hover:text-white"
                                                }`}
                                            >
                                                <div className="flex items-center space-x-2.5 min-w-0">
                                                    <Icon
                                                        className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                                                            isGroupActive && !isMenuOpen
                                                                ? "text-[#4085b3]"
                                                                : "text-slate-400 group-hover:text-white"
                                                        }`}
                                                    />
                                                    <span className="truncate">{item.label}</span>
                                                </div>
                                                <div className="shrink-0 ml-1">
                                                    {isMenuOpen ? (
                                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                                                    ) : (
                                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                                                    )}
                                                </div>
                                            </button>

                                            {/* Sublinks Accordion Content */}
                                            {isMenuOpen && (
                                                <div className="pl-6 pr-1 py-1 space-y-0.5 border-l-2 border-slate-200 ml-3.5 my-0.5">
                                                    {item.subLinks.map((subLink) => {
                                                        const isSubActive =
                                                            pathname === subLink.href ||
                                                            (subLink.href !== item.basePath && pathname.startsWith(`${subLink.href}/`));

                                                        return (
                                                            <Link
                                                                key={subLink.href}
                                                                href={subLink.href}
                                                                title={subLink.label}
                                                                className={`block px-2.5 py-1.5 rounded-md text-xs transition-all duration-150 truncate cursor-pointer ${
                                                                    isSubActive
                                                                        ? "bg-[#4085b3] text-white font-semibold shadow-xs"
                                                                        : "text-slate-600 hover:bg-[#4085b3] hover:text-white"
                                                                }`}
                                                            >
                                                                {subLink.label}
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                // Direct Nav Item
                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href || "#"}
                                        title={item.label}
                                        className={`group flex items-center ${
                                            sidebarCollapsed ? "justify-center px-2 py-2" : "justify-between px-2.5 py-2"
                                        } text-xs transition-all duration-150 cursor-pointer rounded-md ${
                                            isDirectActive
                                                ? "bg-[#4085b3] text-white font-semibold shadow-xs"
                                                : "text-slate-700 hover:bg-[#4085b3] hover:text-white"
                                        }`}
                                    >
                                        <div className={`flex items-center ${sidebarCollapsed ? "" : "space-x-2.5 min-w-0"}`}>
                                            <Icon
                                                className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                                                    isDirectActive ? "text-white" : "text-slate-400 group-hover:text-white"
                                                }`}
                                            />
                                            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                                        </div>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                ))}
            </div>

            {/* Sidebar Utility Footer - System Status */}
            {!sidebarCollapsed ? (
                <div className="p-3 border-t border-slate-200 bg-white text-[11px] shrink-0">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">EMIS System</span>
                        <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Operational
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">FDRE Ministry of Education</p>
                </div>
            ) : (
                <div
                    className="p-2 border-t border-slate-200 bg-white flex justify-center shrink-0"
                    title="EMIS System Operational"
                >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
            )}
        </aside>
    );
}
