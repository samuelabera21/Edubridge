"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import {
    LayoutDashboard,
    User,
    ClipboardCheck,
    GraduationCap,
    BookOpen,
    HeartHandshake,
    MessageSquare,
    CheckSquare,
    Sparkles,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
} from "lucide-react";

export type ParentNavLink = {
    label: string;
    href: string;
};

export type ParentNavGroup = {
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    links: ParentNavLink[];
};

const childOverviewGroups: ParentNavGroup[] = [
    {
        key: "profile",
        label: "Child Profile",
        icon: User,
        links: [
            { label: "General Information", href: "/dashboard/parent/profile" },
            { label: "Academic Enrollment", href: "/dashboard/parent/profile?tab=enrollment" },
        ],
    },
    {
        key: "attendance",
        label: "Attendance",
        icon: ClipboardCheck,
        links: [
            { label: "Attendance Overview", href: "/dashboard/parent/attendance" },
            { label: "Absence & Late Records", href: "/dashboard/parent/attendance?tab=records" },
            { label: "Attendance Alerts", href: "/dashboard/parent/attendance?tab=alerts" },
        ],
    },
];

const academicGrowthGroups: ParentNavGroup[] = [
    {
        key: "academics",
        label: "Academic Results",
        icon: GraduationCap,
        links: [
            { label: "Subject Results", href: "/dashboard/parent/academics" },
            { label: "Performance Trends", href: "/dashboard/parent/academics?tab=trends" },
            { label: "Teacher Feedback", href: "/dashboard/parent/academics?tab=feedback" },
        ],
    },
    {
        key: "activities",
        label: "Learning Activities",
        icon: BookOpen,
        links: [
            { label: "Upcoming Assignments", href: "/dashboard/parent/activities" },
            { label: "Deadlines & Status", href: "/dashboard/parent/activities?tab=deadlines" },
        ],
    },
    {
        key: "support",
        label: "Student Support",
        icon: HeartHandshake,
        links: [
            { label: "Support Notifications", href: "/dashboard/parent/support" },
            { label: "Remedial & Interventions", href: "/dashboard/parent/support?tab=remedial" },
        ],
    },
];

const collaborationGroups: ParentNavGroup[] = [
    {
        key: "communication",
        label: "Communication",
        icon: MessageSquare,
        links: [
            { label: "Direct Messages", href: "/dashboard/parent/communication/messages" },
            { label: "School Announcements", href: "/dashboard/parent/announcements" },
            { label: "Meeting Requests", href: "/dashboard/parent/communication?tab=meetings" },
        ],
    },
    {
        key: "consent",
        label: "Consent & Approvals",
        icon: CheckSquare,
        links: [
            { label: "Activity Consent", href: "/dashboard/parent/consent" },
            { label: "Meeting Confirmation", href: "/dashboard/parent/consent?tab=meetings" },
        ],
    },
    {
        key: "assistant",
        label: "AI Parent Assistant",
        icon: Sparkles,
        links: [
            { label: "Progress Explanations", href: "/dashboard/parent/assistant" },
            { label: "Home Learning Advice", href: "/dashboard/parent/assistant?tab=guide" },
        ],
    },
];

function ParentNavigationContent({
    collapsed,
    onToggleCollapse,
}: {
    collapsed: boolean;
    onToggleCollapse: () => void;
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams ? searchParams.get("tab") : null;

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        profile: pathname.startsWith("/dashboard/parent/profile"),
        attendance: pathname.startsWith("/dashboard/parent/attendance"),
        academics: pathname.startsWith("/dashboard/parent/academics"),
        activities: pathname.startsWith("/dashboard/parent/activities"),
        support: pathname.startsWith("/dashboard/parent/support"),
        communication: pathname.startsWith("/dashboard/parent/communication") || pathname.startsWith("/dashboard/parent/announcements"),
        consent: pathname.startsWith("/dashboard/parent/consent"),
        assistant: pathname.startsWith("/dashboard/parent/assistant"),
    });

    const toggleGroup = (key: string) => {
        setOpenGroups((current) => ({
            ...current,
            [key]: !current[key],
        }));
    };

    const isActive = (href: string) => {
        const [linkPath, linkQuery] = href.split("?");
        if (pathname !== linkPath) {
            return false;
        }

        if (!linkQuery) {
            if (!currentTab) return true;
            if (linkPath.endsWith("/profile") && currentTab === "general") return true;
            if (linkPath.endsWith("/attendance") && currentTab === "overview") return true;
            if (linkPath.endsWith("/academics") && currentTab === "subjects") return true;
            if (linkPath.endsWith("/communication") && currentTab === "messages") return true;
            if (linkPath.endsWith("/activities") && currentTab === "upcoming") return true;
            if (linkPath.endsWith("/support") && currentTab === "notifications") return true;
            if (linkPath.endsWith("/consent") && currentTab === "consent") return true;
            if (linkPath.endsWith("/assistant") && currentTab === "assistant") return true;
            return false;
        }

        const linkParams = new URLSearchParams(linkQuery);
        const expectedTab = linkParams.get("tab");
        return currentTab === expectedTab;
    };

    const renderNavGroup = (group: ParentNavGroup) => {
        const Icon = group.icon;
        const isOpen = openGroups[group.key];
        const isGroupActive = group.links.some((l) => isActive(l.href));

        if (collapsed) {
            return (
                <Link
                    key={group.key}
                    href={group.links[0]?.href || "#"}
                    title={group.label}
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
            <div key={group.key} className="space-y-0.5">
                <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    title={group.label}
                    className={`group w-full flex items-center justify-between px-2.5 py-2 text-xs transition-all duration-150 cursor-pointer rounded-md ${
                        isGroupActive && !isOpen
                            ? "bg-[#4085b3]/10 text-[#245f8b] font-semibold"
                            : "text-slate-700 hover:bg-[#4085b3] hover:text-white"
                    }`}
                >
                    <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon
                            className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                                isGroupActive && !isOpen
                                    ? "text-[#4085b3]"
                                    : "text-slate-400 group-hover:text-white"
                            }`}
                        />
                        <span className="truncate">{group.label}</span>
                    </div>
                    <div className="shrink-0 ml-1">
                        {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                        ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                        )}
                    </div>
                </button>

                {isOpen && (
                    <div className="pl-6 pr-1 py-1 space-y-0.5 border-l-2 border-slate-200 ml-3.5 my-0.5">
                        {group.links.map((link) => {
                            const active = isActive(link.href);
                            return (
                                <Link
                                    key={`${group.key}-${link.label}`}
                                    href={link.href}
                                    title={link.label}
                                    className={`block px-2.5 py-1.5 rounded-md text-xs transition-all duration-150 truncate cursor-pointer ${
                                        active
                                            ? "bg-[#4085b3] text-white font-semibold shadow-xs"
                                            : "text-slate-600 hover:bg-[#4085b3] hover:text-white"
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <aside
            className={`h-full bg-[#f8fafc] border-r border-slate-200 flex flex-col hidden md:flex overflow-y-auto scrollbar-hide text-slate-700 font-sans shrink-0 transition-all duration-200 ease-in-out ${
                collapsed ? "w-16" : "w-64"
            }`}
        >
            {/* Masthead Header */}
            <div className={`flex items-center border-b border-slate-200 bg-white shrink-0 ${
                collapsed ? "justify-center py-3 px-2" : "justify-between px-3.5 py-3"
            }`}>
                {!collapsed && (
                    <div className="min-w-0 pr-2">
                        <span className="text-xs font-bold text-slate-900 truncate block">
                            Parent Portal
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 block truncate">
                            Guardian Oversight & Progress
                        </span>
                    </div>
                )}
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-label={collapsed ? "Expand parent sidebar" : "Collapse parent sidebar"}
                    className={`w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                        collapsed ? "" : "ml-auto"
                    }`}
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <ChevronLeft className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Navigation Body */}
            <div className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto">
                {/* Child Overview Group */}
                <div className="space-y-0.5">
                    {!collapsed && (
                        <div className="px-2.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                            Child Overview
                        </div>
                    )}
                    <nav className="space-y-0.5">
                        <Link
                            href="/dashboard/parent"
                            title="Parent Dashboard"
                            className={`group flex items-center ${
                                collapsed ? "justify-center px-2 py-2" : "justify-between px-2.5 py-2"
                            } text-xs transition-all duration-150 cursor-pointer rounded-md ${
                                pathname === "/dashboard/parent"
                                    ? "bg-[#4085b3] text-white font-semibold shadow-xs"
                                    : "text-slate-700 hover:bg-[#4085b3] hover:text-white"
                            }`}
                        >
                            <div className={`flex items-center ${collapsed ? "" : "space-x-2.5 min-w-0"}`}>
                                <LayoutDashboard
                                    className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                                        pathname === "/dashboard/parent" ? "text-white" : "text-slate-400 group-hover:text-white"
                                    }`}
                                />
                                {!collapsed && <span className="truncate">Parent Dashboard</span>}
                            </div>
                        </Link>

                        {childOverviewGroups.map(renderNavGroup)}
                    </nav>
                </div>

                {/* Academic Growth Group */}
                <div className="space-y-0.5">
                    {!collapsed && (
                        <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                            Academic Progress
                        </div>
                    )}
                    <nav className="space-y-0.5">
                        {academicGrowthGroups.map(renderNavGroup)}
                    </nav>
                </div>

                {/* Collaboration & Approvals Group */}
                <div className="space-y-0.5">
                    {!collapsed && (
                        <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                            Collaboration & Approvals
                        </div>
                    )}
                    <nav className="space-y-0.5">
                        {collaborationGroups.map(renderNavGroup)}
                    </nav>
                </div>
            </div>

            {/* Sidebar Utility Footer - System Status */}
            {!collapsed ? (
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

export default function ParentNavigation(props: {
    collapsed: boolean;
    onToggleCollapse: () => void;
}) {
    return (
        <Suspense
            fallback={
                <aside
                    className={`h-full bg-[#f8fafc] border-r border-slate-200 flex flex-col hidden md:flex shrink-0 ${
                        props.collapsed ? "w-16" : "w-64"
                    }`}
                />
            }
        >
            <ParentNavigationContent {...props} />
        </Suspense>
    );
}
