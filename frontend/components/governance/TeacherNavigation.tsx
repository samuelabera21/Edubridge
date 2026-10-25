"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    BookOpen,
    Users,
    ClipboardCheck,
    FileText,
    GraduationCap,
    HeartHandshake,
    MessageSquare,
    Megaphone,
    Sparkles,
    Settings,
    FileSpreadsheet,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getPrimaryAccess } from "../../lib/auth-access";

interface NavSubLink {
    label: string;
    href: string;
}

interface NavItem {
    label: string;
    icon: LucideIcon;
    href?: string;
    basePath?: string;
    subLinks?: NavSubLink[];
    isSoon?: boolean;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

export default function TeacherNavigation({
    sidebarCollapsed = false,
    onToggleCollapse,
}: {
    sidebarCollapsed?: boolean;
    onToggleCollapse?: () => void;
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams ? searchParams.get("tab") : null;
    const currentType = searchParams ? searchParams.get("type") : null;
    const currentChannel = searchParams ? searchParams.get("channel") : null;

    const { authData } = useAuth(false);
    const primaryAccess = getPrimaryAccess(authData?.access);
    const schoolName = primaryAccess?.scope?.name || "Academic Instruction";

    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setOpenMenus((prev) => {
            const next = { ...prev };
            if (pathname.startsWith("/dashboard/teacher/my-classes")) next["teacherAssignments"] = true;
            if (pathname.startsWith("/dashboard/teacher/attendance")) next["teacherAttendance"] = true;
            if (pathname.startsWith("/dashboard/teacher/curriculum")) next["teacherCurriculum"] = true;
            if (pathname.startsWith("/dashboard/teacher/assessment")) next["teacherAssessment"] = true;
            if (pathname.startsWith("/dashboard/teacher/communication")) next["teacherComm"] = true;
            if (pathname.startsWith("/dashboard/teacher/announcements")) next["teacherAnnounce"] = true;
            if (pathname.startsWith("/dashboard/teacher/pd")) next["teacherPD"] = true;
            return next;
        });
    }, [pathname]);

    const toggleMenu = (key: string) => {
        setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const isSubActive = (href: string, basePath?: string) => {
        const [linkPath, linkQuery] = href.split("?");
        if (pathname !== linkPath) {
            return false;
        }

        if (!linkQuery) {
            return pathname === linkPath && !currentTab && !currentType && !currentChannel;
        }

        const params = new URLSearchParams(linkQuery);
        const tab = params.get("tab");
        const type = params.get("type");
        const channel = params.get("channel");

        if (tab !== null) {
            if (tab === currentTab) return true;
            if (!currentTab && (tab === "take" || tab === "view" || tab === "school" || tab === "training" || tab === "attendance")) return true;
        }
        if (type !== null && type === currentType) return true;
        if (channel !== null) {
            if (channel === currentChannel) return true;
            if (!currentChannel && channel === "STAFF") return true;
        }

        return false;
    };

    const navGroups: NavGroup[] = [
        {
            title: "Instruction & Classes",
            items: [
                {
                    label: "Dashboard",
                    href: "/dashboard/teacher",
                    icon: LayoutDashboard,
                },
                {
                    label: "Teaching Assignments",
                    basePath: "/dashboard/teacher/my-classes",
                    icon: BookOpen,
                    subLinks: [
                        { label: "Classes", href: "/dashboard/teacher/my-classes?tab=classes" },
                        { label: "Timetable", href: "/dashboard/teacher/my-classes?tab=schedule" },
                    ],
                },
                {
                    label: "Student Management",
                    href: "/dashboard/teacher/students",
                    icon: Users,
                },
                {
                    label: "Attendance",
                    basePath: "/dashboard/teacher/attendance",
                    icon: ClipboardCheck,
                    subLinks: [
                        { label: "Take Attendance", href: "/dashboard/teacher/attendance?tab=take" },
                        { label: "Attendance History", href: "/dashboard/teacher/attendance?tab=history" },
                        { label: "Absence Reasons", href: "/dashboard/teacher/attendance?tab=reasons" },
                        { label: "Repeated Absences", href: "/dashboard/teacher/attendance?tab=repeated" },
                        { label: "Report Attendance Problems", href: "/dashboard/teacher/attendance?tab=report" },
                    ],
                },
                {
                    label: "Learning Resources",
                    href: "/dashboard/teacher/curriculum",
                    icon: BookOpen,
                },
                {
                    label: "Results",
                    href: "/dashboard/teacher/results",
                    icon: FileSpreadsheet,
                },
                {
                    label: "Student Support",
                    href: "/dashboard/teacher/support",
                    icon: HeartHandshake,
                },
            ],
        },
        {
            title: "Engagement & Circulars",
            items: [
                {
                    label: "Communication",
                    basePath: "/dashboard/teacher/communication",
                    icon: MessageSquare,
                    subLinks: [
                        { label: "Direct Messages", href: "/dashboard/teacher/communication" },
                        { label: "Policies & Directives", href: "/dashboard/teacher/communication?channel=DIRECTIVES" },
                        { label: "Programs & Initiatives", href: "/dashboard/teacher/communication?channel=PROGRAMS" },
                    ],
                },
                {
                    label: "Announcements",
                    basePath: "/dashboard/teacher/announcements",
                    icon: Megaphone,
                    subLinks: [
                        { label: "School Announcements", href: "/dashboard/teacher/announcements?tab=school" },
                        { label: "Department Announcements", href: "/dashboard/teacher/announcements?tab=department" },
                    ],
                },
            ],
        },
        {
            title: "Development & Systems",
            items: [
                {
                    label: "Professional Dev.",
                    basePath: "/dashboard/teacher/pd",
                    icon: GraduationCap,
                    subLinks: [
                        { label: "Training & Workshops", href: "/dashboard/teacher/pd?tab=training" },
                        { label: "Certificates", href: "/dashboard/teacher/pd?tab=certificates" },
                    ],
                },
                {
                    label: "AI Teacher Assistant",
                    icon: Sparkles,
                    isSoon: true,
                },
                {
                    label: "Settings",
                    href: "/dashboard/teacher/settings",
                    icon: Settings,
                },
            ],
        },
    ];

    return (
        <aside
            className={`h-full bg-[#f8fafc] border-r border-slate-200 flex flex-col hidden md:flex overflow-y-auto scrollbar-hide text-slate-700 font-sans shrink-0 transition-all duration-200 ease-in-out ${
                sidebarCollapsed ? "w-16" : "w-64"
            }`}
        >
            {/* Masthead Header */}
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-200 bg-white shrink-0">
                {!sidebarCollapsed && (
                    <div className="min-w-0 pr-2">
                        <span className="text-xs font-bold text-slate-900 truncate block">
                            Teacher Workspace
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 block truncate">
                            {schoolName} • Faculty
                        </span>
                    </div>
                )}
                {onToggleCollapse && (
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer ml-auto flex items-center justify-center shrink-0"
                    >
                        {sidebarCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <ChevronLeft className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>

            {/* Navigation Body */}
            <div className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto">
                {navGroups.map((group) => (
                    <div key={group.title} className="space-y-0.5">
                        {!sidebarCollapsed && (
                            <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                                {group.title}
                            </div>
                        )}
                        <nav className="space-y-0.5">
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isDirectActive = (item.href && pathname === item.href) || 
                                    (item.href === "/dashboard/teacher/results" && (pathname === "/dashboard/teacher/results" || pathname.startsWith("/dashboard/teacher/assessment")));
                                const isGroupActive =
                                    item.basePath &&
                                    (pathname === item.basePath || pathname.startsWith(`${item.basePath}/`));

                                if (item.isSoon) {
                                    return (
                                        <div
                                            key={item.label}
                                            title="Feature under development"
                                            className={`flex items-center ${
                                                sidebarCollapsed ? "justify-center px-2 py-2" : "justify-between px-2.5 py-2"
                                            } text-xs text-slate-400 cursor-not-allowed select-none rounded-md`}
                                        >
                                            <div className="flex items-center space-x-2.5 min-w-0">
                                                <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                                                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                                            </div>
                                            {!sidebarCollapsed && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-wider">
                                                    Soon
                                                </span>
                                            )}
                                        </div>
                                    );
                                }

                                if (item.subLinks && item.subLinks.length > 0) {
                                    const menuKey =
                                        item.label === "Teaching Assignments"
                                            ? "teacherAssignments"
                                            : item.label === "Attendance"
                                            ? "teacherAttendance"
                                            : (item.label === "Learning Resources" || item.label === "Lesson / Curriculum")
                                            ? "teacherCurriculum"
                                            : item.label === "Assessment & Grades"
                                            ? "teacherAssessment"
                                            : item.label === "Student Support"
                                            ? "teacherSupport"
                                            : item.label === "Communication"
                                            ? "teacherComm"
                                            : item.label === "Announcements"
                                            ? "teacherAnnounce"
                                            : "teacherPD";

                                    const isMenuOpen = !!openMenus[menuKey];

                                    if (sidebarCollapsed) {
                                        return (
                                            <Link
                                                key={item.label}
                                                href={item.subLinks[0].href}
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
                                                className={`group w-full flex items-center justify-between px-2.5 py-2 text-xs transition-all duration-150 cursor-pointer rounded-md ${
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

                                            {isMenuOpen && (
                                                <div className="pl-6 pr-1 py-1 space-y-0.5 border-l-2 border-slate-200 ml-3.5 my-0.5">
                                                    {item.subLinks.map((subLink) => {
                                                        const active = isSubActive(subLink.href, item.basePath);
                                                        return (
                                                            <Link
                                                                key={subLink.href}
                                                                href={subLink.href}
                                                                title={subLink.label}
                                                                className={`block px-2.5 py-1.5 rounded-md text-xs transition-all duration-150 truncate cursor-pointer ${
                                                                    active
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
