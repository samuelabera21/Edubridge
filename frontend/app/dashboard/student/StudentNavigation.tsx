"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Activity,
    BarChart3,
    Bell,
    BookOpen,
    CalendarDays,
    ClipboardCheck,
    FileSpreadsheet,
    FileText,
    HeartHandshake,
    LayoutDashboard,
    MessageSquare,
    Settings,
    Sparkles,
    User,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import StudentSubNavigation, { type StudentNavGroup } from "./components/StudentSubNavigation";

const coreLearningGroups: StudentNavGroup[] = [
    {
        key: "profile",
        label: "My Profile",
        icon: User,
        links: [
            { label: "Student Information", href: "/dashboard/student/profile/information" },
            { label: "School & Enrollment", href: "/dashboard/student/profile/enrollment" },
            { label: "Enrollment Documents", href: "/dashboard/student/profile/documents" },
        ],
    },
    {
        key: "classes",
        label: "My Classes",
        icon: BookOpen,
        links: [
            { label: "Subjects & Teachers", href: "/dashboard/student/classes/subjects" },
            { label: "Class Schedule", href: "/dashboard/student/classes/schedule" },
        ],
    },
];

const progressRecordsGroups: StudentNavGroup[] = [
    {
        key: "attendance",
        label: "My Attendance",
        icon: ClipboardCheck,
        links: [
            { label: "Attendance History", href: "/dashboard/student/attendance" },
            { label: "Absence Records", href: "/dashboard/student/attendance/absence" },
            { label: "Submit Explanation", href: "/dashboard/student/attendance/explanation" },
        ],
    },
    {
        key: "support",
        label: "My Support",
        icon: HeartHandshake,
        links: [
            { label: "Recommendations", href: "/dashboard/student/support/recommendations" },
            { label: "Remedial Activities", href: "/dashboard/student/support/remedial" },
            { label: "Enrichment Activities", href: "/dashboard/student/support/enrichment" },
            { label: "Intervention & Progress", href: "/dashboard/student/support/progress" },
        ],
    },
];

const communityToolsGroups: StudentNavGroup[] = [
    {
        key: "communication",
        label: "Communication",
        icon: MessageSquare,
        links: [
            { label: "Direct Messages", href: "/dashboard/student/communication/messages" },
            { label: "School Announcements", href: "/dashboard/student/communication/announcements" },
            { label: "Communication Overview", href: "/dashboard/student/communication" },
        ],
    },
    {
        key: "resources",
        label: "Learning Resources",
        icon: FileText,
        links: [
            { label: "Teacher Resources", href: "/dashboard/student/resources/teacher" },
            { label: "Recommended Resources", href: "/dashboard/student/resources/recommended" },
            { label: "School Resources", href: "/dashboard/student/resources/school" },
            { label: "Approved External Links", href: "/dashboard/student/resources/links" },
        ],
    },
    {
        key: "assistant",
        label: "AI Study Assistant",
        icon: Sparkles,
        links: [
            { label: "Explain Concepts", href: "/dashboard/student/assistant?mode=explain" },
            { label: "Guided Practice", href: "/dashboard/student/assistant?mode=practice" },
            { label: "Study Planning", href: "/dashboard/student/assistant?mode=plan" },
        ],
    },
];

export default function StudentNavigation({
    collapsed,
    onToggleCollapse,
    isMobile = false,
    onNavigate,
}: {
    collapsed: boolean;
    onToggleCollapse: () => void;
    isMobile?: boolean;
    onNavigate?: () => void;
}) {
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        profile: pathname.startsWith("/dashboard/student/profile"),
        classes: pathname.startsWith("/dashboard/student/classes"),
        attendance: pathname.startsWith("/dashboard/student/attendance"),
        support: pathname.startsWith("/dashboard/student/support"),
        communication: pathname.startsWith("/dashboard/student/communication"),
        resources: pathname.startsWith("/dashboard/student/resources"),
        assistant: pathname.startsWith("/dashboard/student/assistant"),
    });

    const toggleGroup = (key: string) => {
        setOpenGroups((current) => ({
            ...current,
            [key]: !current[key],
        }));
    };

    const [unreadCount, setUnreadCount] = useState<number>(0);

    useEffect(() => {
        fetchApi("/communication/notifications/unread-count")
            .then(async (res) => {
                if (res.ok) {
                    const data = await res.json();
                    if (typeof data.count === "number") setUnreadCount(data.count);
                }
            })
            .catch(() => {});
    }, [pathname]);

    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const isResultsActive =
        pathname === "/dashboard/student/results" ||
        pathname.startsWith("/dashboard/student/results/") ||
        pathname.startsWith("/dashboard/student/assessments") ||
        pathname.startsWith("/dashboard/student/learning");

    return (
        <aside
            className={`h-full bg-[#f8fafc] flex flex-col ${
                isMobile
                    ? "w-full border-r-0"
                    : `border-r border-slate-200 hidden md:flex transition-all duration-200 ease-in-out ${
                          collapsed ? "w-16" : "w-64"
                      }`
            } overflow-y-auto scrollbar-hide text-slate-700 font-sans shrink-0`}
        >
            {/* Masthead Header */}
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-200 bg-white shrink-0">
                {(!collapsed || isMobile) && (
                    <div className="min-w-0 pr-2">
                        <span className="text-xs font-bold text-slate-900 truncate block">
                            Student Portal
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 block truncate">
                            Academic & Learning Records
                        </span>
                    </div>
                )}
                {!isMobile && (
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        aria-label={collapsed ? "Expand student sidebar" : "Collapse student sidebar"}
                        className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer ml-auto flex items-center justify-center shrink-0"
                    >
                        {collapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <ChevronLeft className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>

            {/* Navigation Body */}
            <div className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto">
                {/* Core Learning Group */}
                <div className="space-y-0.5">
                    {(!collapsed || isMobile) && (
                        <div className="px-2.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                            Academics & Schedule
                        </div>
                    )}
                    <nav className="space-y-0.5">
                        <Link
                            href="/dashboard/student"
                            onClick={onNavigate}
                            title="My Dashboard"
                            className={`group flex items-center ${
                                collapsed && !isMobile ? "justify-center px-2 py-2" : "justify-between px-2.5 py-2"
                            } text-xs transition-all duration-150 cursor-pointer rounded-md ${
                                pathname === "/dashboard/student"
                                    ? "bg-[#4085b3] text-white font-semibold shadow-xs"
                                    : "text-slate-700 hover:bg-[#4085b3] hover:text-white"
                            }`}
                        >
                            <div className={`flex items-center ${collapsed && !isMobile ? "" : "space-x-2.5 min-w-0"}`}>
                                <LayoutDashboard
                                    className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                                        pathname === "/dashboard/student" ? "text-white" : "text-slate-400 group-hover:text-white"
                                    }`}
                                />
                                {(!collapsed || isMobile) && <span className="truncate">My Dashboard</span>}
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/student/timetable"
                            onClick={onNavigate}
                            title="Timetable"
                            className={`group flex items-center ${
                                collapsed && !isMobile ? "justify-center px-2 py-2" : "justify-between px-2.5 py-2"
                            } text-xs transition-all duration-150 cursor-pointer rounded-md ${
                                isActive("/dashboard/student/timetable")
                                    ? "bg-[#4085b3] text-white font-semibold shadow-xs"
                                    : "text-slate-700 hover:bg-[#4085b3] hover:text-white"
                            }`}
                        >
                            <div className={`flex items-center ${collapsed && !isMobile ? "" : "space-x-2.5 min-w-0"}`}>
                                <CalendarDays
                                    className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                                        isActive("/dashboard/student/timetable") ? "text-white" : "text-slate-400 group-hover:text-white"
                                    }`}
                                />
                                {(!collapsed || isMobile) && <span className="truncate">Timetable</span>}
                            </div>
                        </Link>

                        {coreLearningGroups.map((group) => (
                            <StudentSubNavigation
                                key={group.key}
                                group={group}
                                isOpen={openGroups[group.key]}
                                pathname={pathname}
                                collapsed={collapsed && !isMobile}
                                onToggle={toggleGroup}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </nav>
                </div>

                {/* Progress & Records Group */}
                <div className="space-y-0.5">
                    {(!collapsed || isMobile) && (
                        <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                            Progress & Records
                        </div>
                    )}
                    <nav className="space-y-0.5">
                        {progressRecordsGroups[0] && (
                            <StudentSubNavigation
                                key={progressRecordsGroups[0].key}
                                group={progressRecordsGroups[0]}
                                isOpen={openGroups[progressRecordsGroups[0].key]}
                                pathname={pathname}
                                collapsed={collapsed && !isMobile}
                                onToggle={toggleGroup}
                                onNavigate={onNavigate}
                            />
                        )}

                        <Link
                            href="/dashboard/student/results"
                            onClick={onNavigate}
                            title="Results"
                            className={`group flex items-center ${
                                collapsed && !isMobile ? "justify-center px-2 py-2" : "justify-between px-2.5 py-2"
                            } text-xs transition-all duration-150 cursor-pointer rounded-md ${
                                isResultsActive
                                    ? "bg-[#4085b3] text-white font-semibold shadow-xs"
                                    : "text-slate-700 hover:bg-[#4085b3] hover:text-white"
                            }`}
                        >
                            <div className={`flex items-center ${collapsed && !isMobile ? "" : "space-x-2.5 min-w-0"}`}>
                                <FileSpreadsheet
                                    className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                                        isResultsActive ? "text-white" : "text-slate-400 group-hover:text-white"
                                    }`}
                                />
                                {(!collapsed || isMobile) && <span className="truncate">Results</span>}
                            </div>
                        </Link>

                        {progressRecordsGroups[1] && (
                            <StudentSubNavigation
                                key={progressRecordsGroups[1].key}
                                group={progressRecordsGroups[1]}
                                isOpen={openGroups[progressRecordsGroups[1].key]}
                                pathname={pathname}
                                collapsed={collapsed && !isMobile}
                                onToggle={toggleGroup}
                                onNavigate={onNavigate}
                            />
                        )}
                    </nav>
                </div>

                {/* Community & Tools Group */}
                <div className="space-y-0.5">
                    {(!collapsed || isMobile) && (
                        <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                            Engagement & Tools
                        </div>
                    )}
                    <nav className="space-y-0.5">
                        {communityToolsGroups.map((group) => (
                            <StudentSubNavigation
                                key={group.key}
                                group={group}
                                isOpen={openGroups[group.key]}
                                pathname={pathname}
                                collapsed={collapsed && !isMobile}
                                onToggle={toggleGroup}
                                onNavigate={onNavigate}
                            />
                        ))}

                        <Link
                            href="/dashboard/student/notifications"
                            onClick={onNavigate}
                            title="Notifications"
                            className={`group flex items-center ${
                                collapsed && !isMobile ? "justify-center px-2 py-2" : "justify-between px-2.5 py-2"
                            } text-xs transition-all duration-150 cursor-pointer rounded-md ${
                                isActive("/dashboard/student/notifications")
                                    ? "bg-[#4085b3] text-white font-semibold shadow-xs"
                                    : "text-slate-700 hover:bg-[#4085b3] hover:text-white"
                            }`}
                        >
                            <div className={`flex items-center ${collapsed && !isMobile ? "" : "space-x-2.5 min-w-0"}`}>
                                <div className="relative shrink-0">
                                    <Bell
                                        className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                                            isActive("/dashboard/student/notifications") ? "text-white" : "text-slate-400 group-hover:text-white"
                                        }`}
                                    />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#4085b3] animate-pulse" />
                                    )}
                                </div>
                                {(!collapsed || isMobile) && <span className="truncate">Notifications</span>}
                            </div>
                            {(!collapsed || isMobile) && unreadCount > 0 && (
                                <span className="rounded-full bg-[#4085b3] text-white px-1.5 py-0.5 text-[10px] font-bold">
                                    {unreadCount}
                                </span>
                            )}
                        </Link>

                        <Link
                            href="/dashboard/student/settings"
                            onClick={onNavigate}
                            title="Settings"
                            className={`group flex items-center ${
                                collapsed && !isMobile ? "justify-center px-2 py-2" : "justify-between px-2.5 py-2"
                            } text-xs transition-all duration-150 cursor-pointer rounded-md ${
                                isActive("/dashboard/student/settings")
                                    ? "bg-[#4085b3] text-white font-semibold shadow-xs"
                                    : "text-slate-700 hover:bg-[#4085b3] hover:text-white"
                            }`}
                        >
                            <div className={`flex items-center ${collapsed && !isMobile ? "" : "space-x-2.5 min-w-0"}`}>
                                <Settings
                                    className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                                        isActive("/dashboard/student/settings") ? "text-white" : "text-slate-400 group-hover:text-white"
                                    }`}
                                />
                                {(!collapsed || isMobile) && <span className="truncate">Settings</span>}
                            </div>
                        </Link>
                    </nav>
                </div>
            </div>

            {/* Sidebar Utility Footer - System Status */}
            {(!collapsed || isMobile) ? (
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
