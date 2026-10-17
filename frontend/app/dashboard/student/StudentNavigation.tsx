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
    FileText,
    HeartHandshake,
    LayoutDashboard,
    MessageSquare,
    Sparkles,
    User,
} from "lucide-react";
import { useState } from "react";
import StudentSubNavigation, { type StudentNavGroup } from "./components/StudentSubNavigation";

const studentNavGroups: StudentNavGroup[] = [
    {
        key: "profile",
        label: "My Profile",
        icon: User,
        links: [
            { label: "Student Information", href: "/dashboard/student/profile/information" },
            { label: "School and Enrollment", href: "/dashboard/student/profile/enrollment" },
        ],
    },
    {
        key: "classes",
        label: "My Classes",
        icon: BookOpen,
        links: [
            { label: "Subjects and Teachers", href: "/dashboard/student/classes/subjects" },
            { label: "Class Schedule", href: "/dashboard/student/classes/schedule" },
            { label: "Learning Resources", href: "/dashboard/student/classes/resources" },
        ],
    },
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
        key: "assessments",
        label: "My Assessments",
        icon: BarChart3,
        links: [
            { label: "Tests and Quizzes", href: "/dashboard/student/assessments" },
            { label: "Results and Feedback", href: "/dashboard/student/assessments/results" },
            { label: "Performance Trends", href: "/dashboard/student/assessments/performance" },
        ],
    },
    {
        key: "learning",
        label: "My Learning Activities",
        icon: Activity,
        links: [
            { label: "Assignments", href: "/dashboard/student/learning/assignments" },
            { label: "Practice and Quizzes", href: "/dashboard/student/learning/practice" },
            { label: "Submitted Work", href: "/dashboard/student/learning/submissions" },
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
    {
        key: "communication",
        label: "Communication",
        icon: MessageSquare,
        links: [
            { label: "Teacher Messages", href: "/dashboard/student/communication/messages" },
            { label: "School Announcements", href: "/dashboard/student/communication/announcements" },
            { label: "Communication Overview", href: "/dashboard/student/communication" },
        ],
    },
    {
        key: "resources",
        label: "Learning Resources",
        icon: FileText,
        links: [
            { label: "Recommended Resources", href: "/dashboard/student/resources" },
            { label: "School Resources", href: "/dashboard/student/resources" },
            { label: "Approved External Links", href: "/dashboard/student/resources" },
        ],
    },
    {
        key: "assistant",
        label: "AI Study Assistant",
        icon: Sparkles,
        links: [
            { label: "Explain Concepts", href: "/dashboard/student/assistant" },
            { label: "Guided Practice", href: "/dashboard/student/assistant" },
            { label: "Study Planning", href: "/dashboard/student/assistant" },
        ],
    },
];

export default function StudentNavigation({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse: () => void }) {
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        profile: pathname.startsWith("/dashboard/student/profile"),
        classes: pathname.startsWith("/dashboard/student/classes"),
        attendance: pathname.startsWith("/dashboard/student/attendance"),
        assessments: pathname.startsWith("/dashboard/student/assessments"),
        learning: pathname.startsWith("/dashboard/student/learning"),
        support: pathname.startsWith("/dashboard/student/support"),
        communication: pathname.startsWith("/dashboard/student/communication"),
        resources: pathname.startsWith("/dashboard/student/resources"),
        assistant: pathname.startsWith("/dashboard/student/assistant"),
    });

    const toggleGroup = (key: string) => {
        setOpenGroups((current) => {
            const willOpen = !current[key];
            return Object.fromEntries(Object.keys(current).map((groupKey) => [groupKey, groupKey === key && willOpen])) as Record<string, boolean>;
        });
    };

    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

    return (
        <aside className={`bg-[#184973] border-r border-[#265e8e] flex flex-col hidden md:flex overflow-y-auto text-blue-100 font-sans shadow-lg shrink-0 transition-all duration-300 ease-in-out ${collapsed ? "w-16" : "w-64"}`} style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
            <div className="flex items-center justify-between px-3 pt-4 pb-2 border-b border-[#265e8e]/50">
                {!collapsed && <p className="text-[10px] text-blue-200/90 font-bold uppercase tracking-widest px-1">Student Workspace</p>}
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-label={collapsed ? "Expand student sidebar" : "Collapse student sidebar"}
                    className={`flex items-center justify-center w-7 h-7 rounded-lg bg-[#225785] hover:bg-[#2c6da7] text-blue-100 hover:text-amber-300 transition-all cursor-pointer shadow-xs ${collapsed ? "mx-auto" : "ml-auto"}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {collapsed
                            ? <><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></>
                            : <><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></>
                        }
                    </svg>
                </button>
            </div>

            <div className="p-3 pt-3 flex-1">
                <nav className="space-y-1">
                    <Link
                        href="/dashboard/student"
                        title="My Dashboard"
                        className={`flex items-center ${collapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                            pathname === "/dashboard/student"
                                ? "bg-[#0f2f4c] text-amber-300 font-semibold border-l-2 border-amber-400 shadow-xs"
                                : "text-blue-50/90 hover:bg-[#225785] hover:text-white hover:translate-x-0.5"
                        }`}
                    >
                        <div className={`flex items-center ${collapsed ? "" : "space-x-3"}`}>
                            <LayoutDashboard className="w-4 h-4 shrink-0 text-amber-300/90" />
                            {!collapsed && <span>My Dashboard</span>}
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/student/timetable"
                        title="Timetable"
                        className={`flex items-center ${collapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                            isActive("/dashboard/student/timetable")
                                ? "bg-[#0f2f4c] text-amber-300 font-semibold border-l-2 border-amber-400 shadow-xs"
                                : "text-blue-50/90 hover:bg-[#225785] hover:text-white hover:translate-x-0.5"
                        }`}
                    >
                        <div className={`flex items-center ${collapsed ? "" : "space-x-3"}`}>
                            <CalendarDays className="w-4 h-4 shrink-0 text-amber-300/90" />
                            {!collapsed && <span>Timetable</span>}
                        </div>
                    </Link>

                    {studentNavGroups.map((group) => (
                        <StudentSubNavigation
                            key={group.key}
                            group={group}
                            isOpen={openGroups[group.key]}
                            pathname={pathname}
                            collapsed={collapsed}
                            onToggle={toggleGroup}
                        />
                    ))}

                    <Link
                        href="/dashboard/student/notifications"
                        title="Notifications"
                        className={`flex items-center ${collapsed ? "justify-center px-2" : "justify-between px-3.5"} py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer mt-2 ${
                            isActive("/dashboard/student/notifications")
                                ? "bg-[#0f2f4c] text-amber-300 font-semibold border-l-2 border-amber-400 shadow-xs"
                                : "text-blue-50/90 hover:bg-[#225785] hover:text-white hover:translate-x-0.5"
                        }`}
                    >
                        <div className={`flex items-center ${collapsed ? "" : "space-x-3"}`}>
                            <Bell className="w-4 h-4 shrink-0 text-amber-300/90" />
                            {!collapsed && <span>Notifications</span>}
                        </div>
                    </Link>
                </nav>
            </div>
        </aside>
    );
}
