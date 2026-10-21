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
    Users
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

const parentNavGroups: ParentNavGroup[] = [
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
    {
        key: "communication",
        label: "Communication",
        icon: MessageSquare,
        links: [
            { label: "Teacher Messages", href: "/dashboard/parent/communication" },
            { label: "School Announcements", href: "/dashboard/parent/communication?tab=announcements" },
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
    onToggleCollapse
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
        communication: pathname.startsWith("/dashboard/parent/communication"),
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

        // When link has NO query string (e.g. /dashboard/parent/profile), it represents default tab
        if (!linkQuery) {
            if (!currentTab) return true;
            // Also match if currentTab equals the default tab name for the page
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

        // When link specifies ?tab=..., compare it with currentTab
        const linkParams = new URLSearchParams(linkQuery);
        const expectedTab = linkParams.get("tab");
        return currentTab === expectedTab;
    };

    return (
        <aside
            className={`bg-[#184973] border-r border-[#265e8e] flex flex-col hidden md:flex overflow-y-auto text-blue-100 font-sans shadow-lg shrink-0 transition-all duration-300 ease-in-out ${
                collapsed ? "w-16" : "w-64"
            }`}
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-3 pt-4 pb-2 border-b border-[#265e8e]/50">
                {!collapsed && (
                    <div className="flex items-center space-x-1.5 px-1">
                        <Users className="w-3.5 h-3.5 text-amber-300/90" />
                        <p className="text-[10px] text-blue-200/90 font-bold uppercase tracking-widest">
                            Parent Portal
                        </p>
                    </div>
                )}
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-label={collapsed ? "Expand parent sidebar" : "Collapse parent sidebar"}
                    className={`flex items-center justify-center w-7 h-7 rounded-lg bg-[#225785] hover:bg-[#2c6da7] text-blue-100 hover:text-amber-300 transition-all cursor-pointer shadow-xs ${
                        collapsed ? "mx-auto" : "ml-auto"
                    }`}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        {collapsed ? (
                            <>
                                <polyline points="13 17 18 12 13 7" />
                                <polyline points="6 17 11 12 6 7" />
                            </>
                        ) : (
                            <>
                                <polyline points="11 17 6 12 11 7" />
                                <polyline points="18 17 13 12 18 7" />
                            </>
                        )}
                    </svg>
                </button>
            </div>

            {/* Nav Items */}
            <div className="p-3 pt-3 flex-1">
                <nav className="space-y-1">
                    {/* Dashboard Home */}
                    <Link
                        href="/dashboard/parent"
                        title="Parent Dashboard"
                        className={`flex items-center ${
                            collapsed ? "justify-center px-2" : "justify-between px-3.5"
                        } py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                            pathname === "/dashboard/parent"
                                ? "bg-[#0f2f4c] text-amber-300 font-semibold border-l-2 border-amber-400 shadow-xs"
                                : "text-blue-50/90 hover:bg-[#225785] hover:text-white hover:translate-x-0.5"
                        }`}
                    >
                        <div className={`flex items-center ${collapsed ? "" : "space-x-3"}`}>
                            <LayoutDashboard className="w-4 h-4 shrink-0 text-amber-300/90" />
                            {!collapsed && <span>Parent Dashboard</span>}
                        </div>
                    </Link>

                    {/* Nav Groups from PARENT.md */}
                    {parentNavGroups.map((group) => {
                        const Icon = group.icon;
                        const isOpen = openGroups[group.key];
                        const isGroupActive = group.links.some((l) => isActive(l.href));

                        return (
                            <div key={group.key} className="pt-1.5">
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.key)}
                                    title={group.label}
                                    className={`w-full flex items-center ${
                                        collapsed ? "justify-center px-2" : "justify-between px-3.5"
                                    } py-2 rounded-xl text-xs font-medium transition-all duration-150 group cursor-pointer ${
                                        isGroupActive
                                            ? "text-amber-200 bg-[#163f64]"
                                            : "text-blue-50/90 hover:bg-[#225785] hover:text-white hover:translate-x-0.5"
                                    }`}
                                >
                                    <div className={`flex items-center ${collapsed ? "" : "space-x-3"}`}>
                                        <Icon className="w-4 h-4 shrink-0 text-amber-300/90 group-hover:scale-105 transition-transform" />
                                        {!collapsed && <span>{group.label}</span>}
                                    </div>
                                    {!collapsed && (
                                        isOpen ? (
                                            <ChevronDown className="w-3.5 h-3.5 text-blue-200 group-hover:text-white transition-colors" />
                                        ) : (
                                            <ChevronRight className="w-3.5 h-3.5 text-blue-300/80 group-hover:text-blue-100 transition-colors" />
                                        )
                                    )}
                                </button>

                                {isOpen && !collapsed && (
                                    <div className="pl-8 pr-2 py-1.5 space-y-1 bg-[#103454]/80 rounded-xl my-1 border-l-2 border-[#2c6da7]/50 shadow-inner">
                                        {group.links.map((link) => (
                                            <Link
                                                key={`${group.key}-${link.label}`}
                                                href={link.href}
                                                className={`block py-1.5 px-2 rounded-lg text-xs transition-all duration-150 hover:translate-x-0.5 ${
                                                    isActive(link.href)
                                                        ? "text-amber-300 font-semibold bg-[#0f2f4c] shadow-xs"
                                                        : "text-blue-200/90 hover:text-amber-200 hover:bg-[#225785]/60"
                                                }`}
                                            >
                                                {link.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}

export default function ParentNavigation(props: {
    collapsed: boolean;
    onToggleCollapse: () => void;
}) {
    return (
        <Suspense fallback={
            <aside className={`bg-[#184973] border-r border-[#265e8e] flex flex-col hidden md:flex shrink-0 ${props.collapsed ? "w-16" : "w-64"}`} />
        }>
            <ParentNavigationContent {...props} />
        </Suspense>
    );
}

